// --- WebSocket Connection ---
const socket = new WebSocket('ws://localhost:8080');

// --- DOM Elements ---
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const readyBtn = document.getElementById('ready-btn');
const startGameBtn = document.getElementById('start-game-btn');
const roomIdInput = document.getElementById('room-id-input');

const statusMessage = document.getElementById('status-message');
const roomInfo = document.getElementById('room-info');
const myStatus = document.getElementById('my-status');
const opponentStatus = document.getElementById('opponent-status');

const roomListDiv = document.getElementById('room-list');
const refreshRoomListBtn = document.getElementById('refresh-room-list-btn');

// --- State ---
let myPlayerId = null;

// --- WebSocket Event Handlers ---
socket.onopen = function (event) {
    console.log('WebSocket connection opened:', event);
    statusMessage.textContent = 'Connected to server. Create or join a room.';

    sendMessage('getRoomList');
};

socket.onmessage = function (event) {
    let msg;
    try {
        msg = JSON.parse(event.data);
        console.log('WebSocket message received:', msg);
    } catch (e) {
        console.error('Failed to parse message:', event.data);
        return;
    }

    switch (msg.type) {
        case 'connected':
            myPlayerId = msg.clientId;
            console.log('My Player ID is:', myPlayerId);
            break;
        case 'roomCreated':
            roomInfo.textContent = `Room ID: ${msg.roomId}. Waiting for opponent...`;
            disableRoomControls();
            readyBtn.disabled = false;
            break;
        case 'roomList':
            renderRoomList(msg.rooms || []);
            break;
        case 'playerJoined':
            statusMessage.textContent = `Player joined! Get ready!`;
            disableRoomControls(); // Also disable room controls for the player who joins
            readyBtn.disabled = false; // Enable the ready button
            if (msg.playerCount === 2) {
                opponentStatus.textContent = 'Not Ready';
                opponentStatus.className = 'player-status not-ready';
            }
            break;

        case 'playerReadyState':
            // Update the status of the opponent who sent the ready signal
            if (msg.playerId !== myPlayerId) {
                opponentStatus.textContent = 'Ready';
                opponentStatus.className = 'player-status ready';
            }
            break;

        case 'allPlayersReady':
            statusMessage.textContent = 'Both players are ready! Press Start Game.';
            startGameBtn.style.display = 'inline-block';
            startGameBtn.disabled = false;
            break;

        case 'gameStarted':
            statusMessage.textContent = 'Game in progress... Solve the cube!';
            // Hide all controls except reset
            document.getElementById('room-controls').style.display = 'none';
            startGameBtn.style.display = 'none';
            readyBtn.style.display = 'none';
            document.getElementById('reset-btn').style.display = 'inline-block'; // Keep reset visible

            // Scramble the cube using the sequence from the server
            if (window.CubeSim && window.CubeSim.performMoves) {
                window.CubeSim.performMoves(window.CubeSim.MY_CUBE_ID, msg.scramble);
                window.CubeSim.performMoves(window.CubeSim.OPPONENT_CUBE_ID, msg.scramble);
            }
            break;

        case 'move':
            if (msg.playerId !== myPlayerId) {
                if (window.CubeSim && window.CubeSim.performMoves) {
                    window.CubeSim.performMoves(window.CubeSim.OPPONENT_CUBE_ID, msg.move);
                }
            }
            break;

        case 'gameOver':
            let winnerMsg = "The game is over! ";
            if (msg.winnerId === myPlayerId) {
                winnerMsg += "You won!";
            } else {
                winnerMsg += "You lost.";
            }
            alert(winnerMsg);
            resetUI();
            if (window.resetCubes) {
                window.resetCubes();
            }
            break;

        case 'opponentDisconnected':
            statusMessage.textContent = 'Opponent disconnected. You can wait for another player or create a new room.';
            resetUI();
            break;

        case 'error':
            alert(`Error: ${msg.message}`);
            break;
    }
};

socket.onclose = function (event) {
    console.log('WebSocket connection closed.');
    statusMessage.textContent = 'Disconnected from server. Please refresh the page to reconnect.';
    disableAllControls();
};

socket.onerror = function (error) {
    console.error('WebSocket error:', error);
    statusMessage.textContent = 'Connection error. Please refresh the page.';
};


// --- UI Event Listeners ---
createRoomBtn.addEventListener('click', () => {
    sendMessage('createRoom');
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        sendMessage('joinRoom', { roomId });
    } else {
        alert('Please enter a Room ID.');
    }
});

readyBtn.addEventListener('click', () => {
    sendMessage('playerReady');
    myStatus.textContent = 'Ready';
    myStatus.className = 'player-status ready';
    readyBtn.disabled = true; // Prevent sending multiple ready signals
});

startGameBtn.addEventListener('click', () => {
    sendMessage('startGame');
});

refreshRoomListBtn.addEventListener('click', () => {
    sendMessage('getRoomList');
});

// --- Helper Functions ---
function sendMessage(type, payload = {}) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, ...payload }));
    } else {
        console.warn(`WebSocket not open. Cannot send message: ${type}`);
    }
}

function disableRoomControls() {
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    roomIdInput.disabled = true;
}

function disableAllControls() {
    disableRoomControls();
    readyBtn.disabled = true;
    startGameBtn.disabled = true;
}
function renderRoomList(rooms) {
    if (!roomListDiv) return;

    roomListDiv.innerHTML = '';

    if (!rooms.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No open rooms.';
        roomListDiv.appendChild(empty);
        return;
    }

    rooms.forEach(r => {
        const row = document.createElement('div');
        row.className = 'room-row';

        const info = document.createElement('span');
        info.textContent = `${r.roomId} (${r.playerCount}/2)`;

        const btn = document.createElement('button');
        btn.textContent = 'Join';
        btn.onclick = () => {
            sendMessage('joinRoom', { roomId: r.roomId });
        };

        row.appendChild(info);
        row.appendChild(btn);
        roomListDiv.appendChild(row);
    });
}

function resetUI() {
    // This can be expanded to fully reset the game state on the client
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    roomIdInput.disabled = false;
    roomIdInput.value = '';
    readyBtn.disabled = false;
    startGameBtn.style.display = 'none';
    myStatus.textContent = 'Not Ready';
    myStatus.className = 'player-status not-ready';
    opponentStatus.textContent = 'Waiting for player...';
    opponentStatus.className = 'player-status';
    roomInfo.textContent = '';
}


// Expose the function to send moves to the global scope
window.CubeSim = window.CubeSim || {};
window.CubeSim.sendMoveToOpponent = function (move) {
    sendMessage('move', { move });
};
window.CubeSim.notifyWin = function () {
    sendMessage('gameWon');
};
