import { renderPlayerList, renderMovieVoting, renderResults } from './ui.js';

// Initialize all socket event handlers
export function initSocketHandlers(socket, state) {
    // Movie event
    socket.on('movie:new', (data) => {
        state.movieNumber = data.movieNumber;
        state.totalMovies = data.totalMovies;
        renderMovieVoting(data.movie);
    });

    // Players status update
    socket.on('players:status', (players) => {
        state.players = players;
        const host = players.find(player => player.isHost);
        if (host) {
            state.hostId = host.id;
        }

        // Update the lobby player list if it exists
        const lobbyPlayerList = document.getElementById('lobby-player-list');
        if (lobbyPlayerList) {
            lobbyPlayerList.innerHTML = renderPlayerList();
        }

        // Update player list in voting screen if it exists
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.innerHTML = state.players.map(player => `
                <div class="flex items-center bg-blue-700 rounded-full px-3 py-1">
                    ${player.name}
                    ${player.hasVoted
                ? '<span class="ml-1 text-green-300">✓</span>'
                : '<span class="ml-1 text-yellow-300">⋯</span>'
            }
                    ${player.isHost ? '<span class="ml-1 text-yellow-300">👑</span>' : ''}
                </div>
            `).join('');
        }
    });

    // Votes remaining update
    socket.on('votes:remaining', (votes) => {
        state.votesRemaining = votes;

        // Update vote buttons if they exist
        const upVoteBtn = document.getElementById('vote-up');
        const downVoteBtn = document.getElementById('vote-down');

        if (upVoteBtn) {
            upVoteBtn.className = `flex flex-col items-center ${state.votesRemaining.upvotes > 0 ? 'text-green-600' : 'text-gray-400'}`;
            upVoteBtn.disabled = state.votesRemaining.upvotes === 0;
            const upVoteSpan = upVoteBtn.querySelector('span');
            if (upVoteSpan) {
                upVoteSpan.textContent = `${state.votesRemaining.upvotes} left`;
            }
        }

        if (downVoteBtn) {
            downVoteBtn.className = `flex flex-col items-center ${state.votesRemaining.downvotes > 0 ? 'text-red-600' : 'text-gray-400'}`;
            downVoteBtn.disabled = state.votesRemaining.downvotes === 0;
            const downVoteSpan = downVoteBtn.querySelector('span');
            if (downVoteSpan) {
                downVoteSpan.textContent = `${state.votesRemaining.downvotes} left`;
            }
        }
    });

    // Round complete event
    socket.on('round:complete', (data) => {
        renderResults(data);
    });

    // Handle socket connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        alert('Failed to connect to server. Please try again.');
    });
}