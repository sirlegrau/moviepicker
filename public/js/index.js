// Add type="module" to the script tag in your HTML file:
// <script type="module" src="index.js"></script>

// Import UI functions
import {
    showGameScreen,
    showResultsScreen,
    updateLobbyInfo,
    renderMovieVoting,
    renderResults
} from './ui.js';

// Import socket handlers
import { initSocketHandlers } from './socket-handlers.js';

// Socket configuration
const socket = io({
    pingTimeout: 60000,
});

// App state
const state = {
    lobbyId: null,
    playerId: null,
    playerName: '',
    currentMovie: null,
    votesRemaining: { upvotes: 3, downvotes: 3 },
    players: [],
    movieNumber: 0,
    totalMovies: 0,
    results: null,
    topic: 'popular', // Default topic
    hasVotedForCurrentMovie: false
};

// DOM elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const playerNameInput = document.getElementById('player-name');
const createLobbyBtn = document.getElementById('create-lobby');
const lobbyIdInput = document.getElementById('lobby-id');
const joinLobbyBtn = document.getElementById('join-lobby');
const topicSelect = document.getElementById('movie-topic');

// Create a new lobby
createLobbyBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    state.playerName = playerName;
    state.topic = topicSelect ? topicSelect.value : 'popular';
    socket.emit('lobby:create', { playerName, topic: state.topic }, (response) => {
        if (response.success) {
            state.lobbyId = response.lobbyId;
            state.playerId = response.playerId;
            state.hostId = response.playerId; // Track that this player is the host

            showGameScreen();
            updateLobbyInfo();
        } else {
            alert('Error creating lobby: ' + response.error);
        }
    });
});

// Join an existing lobby
joinLobbyBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const lobbyId = lobbyIdInput.value.trim();

    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    if (!lobbyId) {
        alert('Please enter a lobby code');
        return;
    }

    state.playerName = playerName;

    socket.emit('lobby:join', { lobbyId, playerName }, (response) => {
        if (response.success) {
            state.lobbyId = response.lobbyId;
            state.playerId = response.playerId;
            state.topic = response.topic; // Get the topic from the existing lobby

            showGameScreen();
            updateLobbyInfo();
        } else {
            alert('Error joining lobby: ' + response.error);
        }
    });
});

// Function to start the game
function startGame() {
    const lobbyInfo = gameScreen.querySelector('.tamare');
    if (lobbyInfo) {
        lobbyInfo.remove();
    }
    socket.emit('round:ready');
    document.getElementById('start-game-btn').disabled = true;
    document.getElementById('start-game-btn').textContent = 'Game starting...';
}

// Vote function
function vote(voteType) {
    // Set the flag to true to prevent further votes
    state.hasVotedForCurrentMovie = true;

    // Disable all vote buttons
    const upVoteBtn = document.getElementById('vote-up');
    const downVoteBtn = document.getElementById('vote-down');
    const passBtn = document.getElementById('vote-pass');

    if (upVoteBtn) upVoteBtn.disabled = true;
    if (downVoteBtn) downVoteBtn.disabled = true;
    if (passBtn) passBtn.disabled = true;

    // Add a visual indicator that buttons are disabled
    if (upVoteBtn) upVoteBtn.classList.replace('text-green-600', 'text-gray-400');
    if (downVoteBtn) downVoteBtn.classList.replace('text-red-600', 'text-gray-400');
    if (passBtn) passBtn.classList.replace('text-gray-600', 'text-gray-400');

    // Send the vote to the server
    socket.emit('vote:cast', {
        movieId: state.currentMovie.id,
        voteType: voteType
    });
}

function playagainF() {
    location.reload();
}

// Initialize socket handlers
initSocketHandlers(socket, state);

// Export what other modules need access to
export {
    state,
    vote,
    startGame,
    playagainF
};