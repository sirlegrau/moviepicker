
const socket =io({
    pingTimeout: 60000,
});

// DOM elements

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const playerNameInput = document.getElementById('player-name');
const createLobbyBtn = document.getElementById('create-lobby');
const lobbyIdInput = document.getElementById('lobby-id');
const joinLobbyBtn = document.getElementById('join-lobby');
const topicSelect = document.getElementById('movie-topic'); // New element for topic selection

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

// Show game screen and hide others
function showGameScreen() {
    loginScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

// Show results screen and hide others
function showResultsScreen() {
    loginScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
}

function updateLobbyInfo() {
    // Clear previous content first
    const existingInfo = gameScreen.querySelector('.bg-blue-100');
    if (existingInfo) existingInfo.remove();

    // Create a sharable code display with player list
    const lobbyInfoHtml = `
    <div class="bg-blue-100 text-blue-800 p-2 text-center rounded-lg shadow-sm">
    <div class="tamare">
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-lg">Lobby Code: <span>${state.lobbyId}</span></h2>
        <button class="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition" 
                onclick="navigator.clipboard.writeText('${state.lobbyId}')">
          Copy
        </button>
      </div>
      
      <div class="text-sm mb-3">Topic: ${state.topic}</div>
      
      <!-- Player list section -->
      <div class="mb-3">
        <h3 class="font-bold text-left mb-2">Players in Lobby:</h3>
        <div id="lobby-player-list" class="flex flex-wrap gap-2 justify-start">
          ${renderPlayerList()}
        </div>
      </div>
      
      ${state.playerId === state.hostId ? `
        <button id="start-game-btn" class="w-full mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
          Start Game
        </button>
      ` : `
        <div class="mt-2 text-sm p-2 bg-yellow-100 text-yellow-800 rounded">Waiting for host to start game...</div>
      `}
      </div>
    </div>
  `;

    // Insert at the top of the game screen
    gameScreen.insertAdjacentHTML('afterbegin', lobbyInfoHtml);

    // Add event listener to start button if it exists
    const startButton = document.getElementById('start-game-btn');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
}
// Helper function to render player list
function renderPlayerList() {
    if (!state.players || state.players.length === 0) {
        return '<div class="text-gray-500 italic">No players yet</div>';
    }

    return state.players.map(player => `
        <div class="flex items-center bg-white border border-blue-200 rounded-full px-3 py-1">
            ${player.name}
            ${player.isHost ? '<span class="ml-1 text-yellow-500">👑</span>' : ''}
        </div>
    `).join('');
}
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
function renderMovieVoting(movie) {
    state.currentMovie = movie;
    state.hasVotedForCurrentMovie = false;

    const movieHtml = `
    <header class="absolute top-4 left-4 bg-blue-700 text-white px-4 py-2 rounded-md shadow-md text-sm font-medium">
        Movie ${state.movieNumber} of ${state.totalMovies}
    </header>

    <div class="absolute top-16 left-4 flex flex-col gap-2" id="player-list">
        ${state.players.map(player => `
          <div class="flex items-center bg-blue-700 text-white rounded-full px-3 py-1 shadow-md">
            ${player.name}
            ${player.hasVoted ? '<span class="ml-1 text-green-300">✓</span>' : '<span class="ml-1 text-yellow-300">⋯</span>'}
            ${player.isHost ? '<span class="ml-1 text-yellow-300">👑</span>' : ''}
          </div>
        `).join('')}
    </div>

    <main class="flex flex-col md:flex-row justify-center items-center h-screen p-4 gap-6">
            <div class="w-1/2 max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
            <h2 class="text-xl font-bold mb-2 text-center">${movie.title} ${movie.releaseYear ? `(${movie.releaseYear})` : ''}</h2>
  
            ${movie.rating ? `<div class="mt-2 flex justify-center items-center text-lg"><span class="text-yellow-500">★</span> <span class="ml-1">${movie.rating}/10</span></div>` : ''}
            ${movie.duration ? `<div class="mt-2 flex justify-center items-center text-lg"><span class="text-yellow-500">⌛</span> <span class="ml-1">${movie.duration}m</span></div>` : ''}
            
            <div class="mt-4 flex justify-center gap-6 w-full absolute bottom-8">
                <button 
                    id="vote-down"
                    class="text-2xl ${state.votesRemaining.downvotes > 0 ? 'text-red-600' : 'text-gray-400'} px-4 py-2 rounded-md shadow-md"
                    ${state.votesRemaining.downvotes === 0 ? 'disabled' : ''}>
                    🤢 <span class="text-xs block">${state.votesRemaining.downvotes} left</span>
                </button>
                <button id="vote-pass" class="text-2xl text-gray-600 px-4 py-2 rounded-md shadow-md">⏭️
                 <span class="text-xs block">pass</span>
                 </button>
               
                <button 
                    id="vote-up"
                    class="text-2xl ${state.votesRemaining.upvotes > 0 ? 'text-green-600' : 'text-gray-400'} px-4 py-2 rounded-md shadow-md"
                    ${state.votesRemaining.upvotes === 0 ? 'disabled' : ''}>
                    ❤️ <span class="text-xs block">${state.votesRemaining.upvotes} left</span>
                </button>
            </div>
        </div>
        <div class="w-1/2 max-w-md bg-white rounded-lg shadow-lg overflow-hidden flex flex-col items-center">
            <div class="relative flex justify-center" style="height: 95vh;">
                <img 
                    src="${movie.imageUrl}" 
                    alt="${movie.title}"
                    style="max-height: 95vh; max-width: 100%;"
                    class="object-contain"
                />
            </div>
        </div>
    </main>
    `;

    gameScreen.innerHTML = '';
    gameScreen.insertAdjacentHTML('beforeend', movieHtml);

    document.getElementById('vote-up').addEventListener('click', () => {
        if (state.votesRemaining.upvotes > 0 && !state.hasVotedForCurrentMovie) {
            vote('up');
        }
    });

    document.getElementById('vote-down').addEventListener('click', () => {
        if (state.votesRemaining.downvotes > 0 && !state.hasVotedForCurrentMovie) {
            vote('down');
        }
    });

    document.getElementById('vote-pass').addEventListener('click', () => {
        if (!state.hasVotedForCurrentMovie) {
            vote('pass');
        }
    });
}
// Modify the vote function to disable buttons after voting
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

// Render results screen
function renderResults(resultsData) {
    state.results = resultsData;

    // Switch to results screen
    showResultsScreen();

    // Initialize empty container
    resultsScreen.innerHTML = `
    <div class="p-4 max-w-md mx-auto">
      <h1 class="text-2xl font-bold text-center mb-6">Results</h1>
      <div id="results-container" class="space-y-8"></div>
      <div class="mt-8 flex justify-center">
        <button id="play-again" class="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">
          Play Again
        </button>
      </div>
    </div>
  `;

    // Get the container for results
    const resultsContainer = document.getElementById('results-container');

    // Set up animation of results
    let currentIndex = 0;

    function revealNextMovie() {
        if (currentIndex >= resultsData.results.length) return;

        const movie = resultsData.results[currentIndex];
        const movieVotes = resultsData.votes[movie.id] || {};

        // Create movie result card
        const movieCard = document.createElement('div');
        movieCard.className = 'bg-white rounded-lg shadow-lg overflow-hidden animate-reveal';

        // Movie details
        movieCard.innerHTML = `
      <div class="flex items-center p-4">
        <div class="text-2xl font-bold mr-4">#${currentIndex + 1}</div>
        <div class="flex-shrink-0">
          <img 
            src="${movie.imageUrl}" 
            alt="${movie.title}"
            class="w-16 h-24 object-cover rounded"
          />
        </div>
        <div class="ml-4 flex-1">
          <h3 class="font-bold">${movie.title}  ${movie.releaseYear}</h3>
          <div class="flex items-center gap-4 mt-1">
            <div class="flex items-center text-green-600">
              <span class="mr-1">❤️</span> ${movie.votes.up}
            </div>
            <div class="flex items-center text-red-600">
              <span class="mr-1">🤢</span> ${movie.votes.down}
            </div>
            <div class="flex items-center text-gray-500">
              <span class="mr-1">⏭️</span> ${movie.votes.pass}
            </div>
          </div>
        </div>
        <div class="text-xl font-bold ml-2">
          ${movie.score > 0 ? '+' : ''}${movie.score}
        </div>
      </div>
      
      <!-- Player votes -->
      <div class="px-4 pb-4 border-t pt-2">
        <div class="flex flex-wrap gap-2 mt-2">
          ${Object.entries(movieVotes).map(([playerId, vote]) => {
            const player = state.players.find(p => p.id === playerId) || { name: 'Unknown' };
            let voteIcon = '⏭️';
            let bgColor = 'bg-gray-200';

            if (vote === 'up') {
                voteIcon = '❤️';
                bgColor = 'bg-green-100';
            } else if (vote === 'down') {
                voteIcon = '🤢';
                bgColor = 'bg-red-100';
            }

            return `
              <div class="flex items-center rounded-full px-3 py-1 ${bgColor}">
                <span class="text-sm">${player.name}</span>
                <span class="ml-1">${voteIcon}</span>
              </div>
            `;
        }).join('')}
        </div>
      </div>
    `;

        resultsContainer.appendChild(movieCard);
        currentIndex++;

        // Continue revealing movies
        if (currentIndex < resultsData.results.length) {
            setTimeout(revealNextMovie, 1000);
        }
    }

    // Start the animation
    revealNextMovie();

    const playagain = document.getElementById('play-again');
    if (playagain) {
        playagain.addEventListener('click', playagainF);
    }

    function playagainF() {
        location.reload()
    }
}


// Socket.IO event listeners
socket.on('movie:new', (data) => {
    state.movieNumber = data.movieNumber;
    state.totalMovies = data.totalMovies;
    renderMovieVoting(data.movie);
});
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

socket.on('votes:remaining', (votes) => {
    state.votesRemaining = votes;

    // Update vote buttons if they exist
    const upVoteBtn = document.getElementById('vote-up');
    const downVoteBtn = document.getElementById('vote-down');

    if (upVoteBtn) {
        upVoteBtn.className = `flex flex-col items-center ${state.votesRemaining.upvotes > 0 ? 'text-green-600' : 'text-gray-400'}`;
        upVoteBtn.disabled = state.votesRemaining.upvotes === 0;
        upVoteBtn.querySelector('div:last-child').textContent = `${state.votesRemaining.upvotes} left`;
    }

    if (downVoteBtn) {
        downVoteBtn.className = `flex flex-col items-center ${state.votesRemaining.downvotes > 0 ? 'text-red-600' : 'text-gray-400'}`;
        downVoteBtn.disabled = state.votesRemaining.downvotes === 0;
        downVoteBtn.querySelector('div:last-child').textContent = `${state.votesRemaining.downvotes} left`;
    }
});

socket.on('round:complete', (data) => {
    renderResults(data);
});

// Handle socket connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    alert('Failed to connect to server. Please try again.');
});