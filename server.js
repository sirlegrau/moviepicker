const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { getMoviesForGame } = require('./tmdbService');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const lobbies = {};
const players = {};

// Constants
const MAX_MOVIES_PER_ROUND = 10;
const DEFAULT_VOTES = { upvotes: 3, downvotes: 3 };

function getRandomMovies(arr, x) {
    let shuffled = [...arr]; // Create a copy of the array
    for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // Pick a random index
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap
    }
    return shuffled.slice(0, x); // Get the first x items
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new lobby
    socket.on('lobby:create', async ({ playerName, topic = 'popular' }, callback) => {
        try {
            // Generate unique lobby ID
            const lobbyId = generateLobbyCode();
            const playerId = socket.id;

            // Fetch movies based on the selected topic
            const movieFetch = await getMoviesForGame(topic, 25);
            const movies = getRandomMovies(movieFetch, 9);


            // Create lobby
            lobbies[lobbyId] = {
                id: lobbyId,
                hostId: playerId,
                players: [playerId],
                movies: movies,
                currentMovieIndex: 0,
                votes: {},
                gameState: 'waiting',
                topic: topic
            };

            // Create player
            players[playerId] = {
                id: playerId,
                name: playerName,
                lobbyId: lobbyId,
                hasVoted: false,
                votesRemaining: { ...DEFAULT_VOTES },
                socket: socket
            };

            // Join socket room
            socket.join(lobbyId);

            // Send success response
            callback({
                success: true,
                lobbyId: lobbyId,
                playerId: playerId,
                topic: topic,
                hostId: playerId,
            });

            // Update player list for all in lobby
            updatePlayerStatus(lobbyId);
        } catch (error) {
            console.error('Error creating lobby:', error);
            callback({ success: false, error: 'Failed to create lobby' });
        }
    });

    // Join an existing lobby
    socket.on('lobby:join', ({ lobbyId, playerName }, callback) => {
        try {
            // Check if lobby exists
            if (!lobbies[lobbyId]) {
                return callback({ success: false, error: 'Lobby not found' });
            }

            const playerId = socket.id;
            const lobby = lobbies[lobbyId];

            // Add player to lobby
            lobby.players.push(playerId);

            // Create player
            players[playerId] = {
                id: playerId,
                name: playerName,
                lobbyId: lobbyId,
                hasVoted: false,
                votesRemaining: { ...DEFAULT_VOTES },
                socket: socket
            };

            // Join socket room
            socket.join(lobbyId);

            // Send success response
            callback({
                success: true,
                lobbyId: lobbyId,
                playerId: playerId,
                topic: lobby.topic,
                hostId: lobby.hostId
            });

            // Update player list for all in lobby
            updatePlayerStatus(lobbyId);

            // If game is in progress, send current movie
            if (lobby.gameState === 'in_progress') {
                const currentMovie = lobby.movies[lobby.currentMovieIndex];

                socket.emit('movie:new', {
                    movie: currentMovie,
                    movieNumber: lobby.currentMovieIndex + 1,
                    totalMovies: lobby.movies.length
                });
            }
        } catch (error) {
            console.error('Error joining lobby:', error);
            callback({ success: false, error: 'Failed to join lobby' });
        }
    });

    // Player ready to start
    socket.on('round:ready', () => {
        const playerId = socket.id;
        const player = players[playerId];

        if (!player) return;

        const lobbyId = player.lobbyId;
        const lobby = lobbies[lobbyId];

        if (!lobby) return;

        // Reset player votes
        player.votesRemaining = { ...DEFAULT_VOTES };
        player.hasVoted = false;

        // Reset lobby if this is a new round
        if (lobby.gameState === 'completed') {
            startNewRound(lobbyId);
        }

        // Update player status
        updatePlayerStatus(lobbyId);

        // Send first movie if all players are ready
        const allReady = lobby.players.every(playerId => !players[playerId].hasVoted);

        if (allReady && lobby.gameState !== 'in_progress') {
            lobby.gameState = 'in_progress';
            sendNextMovie(lobbyId);
        }
    });

// Cast vote
    socket.on('vote:cast', ({ movieId, voteType }) => {
        const playerId = socket.id;
        const player = players[playerId];

        if (!player) return;

        const lobbyId = player.lobbyId;
        const lobby = lobbies[lobbyId];

        if (!lobby || player.hasVoted) return;

        // Record the vote
        if (!lobby.votes[movieId]) {
            lobby.votes[movieId] = {};
        }

        // Check if player has enough votes of that type
        if (voteType === 'up' && player.votesRemaining.upvotes <= 0) return;
        if (voteType === 'down' && player.votesRemaining.downvotes <= 0) return;

        // Record the vote
        lobby.votes[movieId][playerId] = voteType;

        // Decrease remaining votes
        if (voteType === 'up') {
            player.votesRemaining.upvotes--;
        } else if (voteType === 'down') {
            player.votesRemaining.downvotes--;
        }

        // Mark player as voted
        player.hasVoted = true;

        // Send updated vote count to player
        socket.emit('votes:remaining', player.votesRemaining);

        // Update player status for everyone
        updatePlayerStatus(lobbyId);

        // Check if all players have voted
        const allVoted = lobby.players.every(id => !players[id] || players[id].hasVoted);

        if (allVoted) {
            // Move to next movie or end round
            if (lobby.currentMovieIndex < lobby.movies.length - 1) {
                lobby.currentMovieIndex++;
                resetPlayerVotes(lobbyId);
                sendNextMovie(lobbyId);
            } else {
                endRound(lobbyId);
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const playerId = socket.id;
        const player = players[playerId];

        if (!player) return;

        // Get player's lobby
        const lobbyId = player.lobbyId;
        const lobby = lobbies[lobbyId];

        if (lobby) {
            // Remove player from lobby
            lobby.players = lobby.players.filter(id => id !== playerId);

            // If host left, assign a new host or delete the lobby if empty
            if (lobby.hostId === playerId) {
                if (lobby.players.length > 0) {
                    lobby.hostId = lobby.players[0];
                } else {
                    delete lobbies[lobbyId];
                    return;
                }
            }

            // Update player status for everyone
            updatePlayerStatus(lobbyId);

            // Check if all remaining players have voted
            const allVoted = lobby.players.every(id => !players[id] || players[id].hasVoted);

            if (allVoted && lobby.gameState === 'in_progress') {
                // Move to next movie or end round
                if (lobby.currentMovieIndex < lobby.movies.length - 1) {
                    lobby.currentMovieIndex++;
                    resetPlayerVotes(lobbyId);
                    sendNextMovie(lobbyId);
                } else {
                    endRound(lobbyId);
                }
            }
        }

        // Delete player
        delete players[playerId];
        console.log('User disconnected:', playerId);
    });
});

// Helper functions
function generateLobbyCode() {
    // Generate a 6-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';

    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code is already in use and regenerate if needed
    if (lobbies[result]) {
        return generateLobbyCode();
    }

    return result;
}

function updatePlayerStatus(lobbyId) {
    const lobby = lobbies[lobbyId];

    if (!lobby) return;

    // Prepare player list with vote status
    const playerList = lobby.players
        .filter(id => players[id])
        .map(id => ({
            id: id,
            name: players[id].name,
            hasVoted: players[id].hasVoted,
            isHost: id === lobby.hostId
        }));

    // Send updated player list to all players in lobby
    io.to(lobbyId).emit('players:status', playerList);
}

function sendNextMovie(lobbyId) {
    const lobby = lobbies[lobbyId];

    if (!lobby) return;

    const movie = lobby.movies[lobby.currentMovieIndex];

    // Send new movie to all players in lobby
    io.to(lobbyId).emit('movie:new', {
        movie: movie,
        movieNumber: lobby.currentMovieIndex + 1,
        totalMovies: lobby.movies.length
    });
}

function resetPlayerVotes(lobbyId) {
    const lobby = lobbies[lobbyId];

    if (!lobby) return;

    // Reset all players' vote status
    lobby.players.forEach(playerId => {
        const player = players[playerId];
        if (player) {
            player.hasVoted = false;
        }
    });
}

function endRound(lobbyId) {
    const lobby = lobbies[lobbyId];

    if (!lobby) return;

    // Mark game as completed
    lobby.gameState = 'completed';

    // Calculate results
    const results = calculateResults(lobby);

    // Send results to all players
    io.to(lobbyId).emit('round:complete', results);
}

function calculateResults(lobby) {
    // Prepare results
    const movieResults = [];

    // Process each movie
    lobby.movies.forEach(movie => {
        // Get votes for this movie
        const movieVotes = lobby.votes[movie.id] || {};

        // Count different vote types
        const upVotes = Object.values(movieVotes).filter(v => v === 'up').length;
        const downVotes = Object.values(movieVotes).filter(v => v === 'down').length;
        const passVotes = Object.values(movieVotes).filter(v => v === 'pass').length;

        // Calculate score: +1 for upvote, -1 for downvote
        const score = upVotes - downVotes;

        // Add to results
        movieResults.push({
            ...movie,
            votes: {
                up: upVotes,
                down: downVotes,
                pass: passVotes
            },
            score: score
        });
    });

    // Sort by score (descending)
    movieResults.sort((a, b) => b.score - a.score);

    return {
        results: movieResults,
        votes: lobby.votes
    };
}

function startNewRound(lobbyId) {
    const lobby = lobbies[lobbyId];

    if (!lobby) return;

    // Reset lobby for new round
    lobby.currentMovieIndex = 0;
    lobby.votes = {};
    lobby.gameState = 'waiting';

    // Reset all players
    lobby.players.forEach(playerId => {
        const player = players[playerId];
        if (player) {
            player.hasVoted = false;
            player.votesRemaining = { ...DEFAULT_VOTES };
        }
    });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});