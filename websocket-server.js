const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

// In-memory store for rooms
// rooms = { roomId: { players: [ws1, ws2], readyStates: Map<ws, boolean> } }
const rooms = {};

console.log('WebSocket server started on port 8080');

wss.on('connection', ws => {
    console.log('Client connected');
    let clientId = uuidv4(); // Assign a unique ID to each client connection
    ws.id = clientId;

    // Send the client its ID
    sendMessage(ws, 'connected', { clientId });

    ws.on('message', message => {
        let data;
        try {
            data = JSON.parse(message);
            console.log(`Received message:`, data);
        } catch (e) {
            console.error('Failed to parse message:', message);
            return;
        }

        switch (data.type) {
            case 'createRoom':
                handleCreateRoom(ws);
                break;
            case 'joinRoom':
                handleJoinRoom(ws, data.roomId);
                break;
            case 'playerReady':
                handlePlayerReady(ws);
                break;
            case 'startGame':
                handleStartGame(ws);
                break;
            case 'move':
                handleMove(ws, data.move);
                break;
            case 'gameWon':
                handleGameWon(ws);
                break;
            default:
                console.warn(`Unknown message type: ${data.type}`);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${ws.id} disconnected`);
        handleDisconnect(ws);
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

function handleCreateRoom(ws) {
    const roomId = uuidv4().slice(0, 6); // Create a short, unique room ID
    rooms[roomId] = {
        players: [ws],
        readyStates: new Map([[ws, false]])
    };
    ws.roomId = roomId; // Assign roomId to the ws connection for later reference

    sendMessage(ws, 'roomCreated', { roomId });
    console.log(`Room ${roomId} created by Client ${ws.id}`);
}

function handleJoinRoom(ws, roomId) {
    const room = rooms[roomId];
    if (!room) {
        sendMessage(ws, 'error', { message: 'Room not found' });
        return;
    }
    if (room.players.length >= 2) {
        sendMessage(ws, 'error', { message: 'Room is full' });
        return;
    }

    room.players.push(ws);
    room.readyStates.set(ws, false);
    ws.roomId = roomId;

    console.log(`Client ${ws.id} joined room ${roomId}`);

    // Notify both players that they are in the room together
    broadcastToRoom(roomId, 'playerJoined', { roomId, playerCount: room.players.length });
}

function handlePlayerReady(ws) {
    const room = rooms[ws.roomId];
    if (!room) return;

    room.readyStates.set(ws, true);
    console.log(`Client ${ws.id} in room ${ws.roomId} is ready.`);
    
    broadcastToRoom(ws.roomId, 'playerReadyState', { playerId: ws.id, isReady: true });

    // Check if all players are ready
    let allReady = true;
    for (const ready of room.readyStates.values()) {
        if (!ready) {
            allReady = false;
            break;
        }
    }

    if (allReady && room.players.length === 2) {
        console.log(`All players in room ${ws.roomId} are ready.`);
        broadcastToRoom(ws.roomId, 'allPlayersReady', {});
    }
}

function handleStartGame(ws) {
    const room = rooms[ws.roomId];
    if (!room || room.players.length !== 2) return;

    // Verify all players are ready before starting
    let allReady = true;
    for (const ready of room.readyStates.values()) {
        if (!ready) allReady = false;
    }

    if (allReady) {
        console.log(`Game starting in room ${ws.roomId}`);
        const scrambleSequence = generateScramble();
        broadcastToRoom(ws.roomId, 'gameStarted', { scramble: scrambleSequence });
    } else {
        console.warn(`Attempted to start game in room ${ws.roomId} but not all players were ready.`);
    }
}


function handleMove(ws, move) {
    const room = rooms[ws.roomId];
    if (!room) return;

    // Relay the move to the other player in the room, including the sender's ID
    room.players.forEach(player => {
        if (player.readyState === WebSocket.OPEN) {
            sendMessage(player, 'move', { playerId: ws.id, move });
        }
    });
}

function handleGameWon(ws) {
    const room = rooms[ws.roomId];
    if (!room) return;

    console.log(`Player ${ws.id} won in room ${ws.roomId}.`);
    broadcastToRoom(ws.roomId, 'gameOver', { winnerId: ws.id });

    // Optional: Reset ready states for a potential rematch, or just let clients disconnect/reset
    room.readyStates.forEach((value, key) => {
        room.readyStates.set(key, false);
    });
}


function handleDisconnect(ws) {
    const room = rooms[ws.roomId];
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter(player => player !== ws);
    room.readyStates.delete(ws);

    if (room.players.length === 0) {
        // If room is empty, delete it
        console.log(`Room ${ws.roomId} is empty, deleting.`);
        delete rooms[ws.roomId];
    } else {
        // Notify remaining player
        console.log(`Player disconnected from room ${ws.roomId}, notifying opponent.`);
        broadcastToRoom(ws.roomId, 'opponentDisconnected', {});
        // Reset ready state for the remaining player
        const remainingPlayer = room.players[0];
        room.readyStates.set(remainingPlayer, false);
    }
}

// --- Helper Functions ---

function sendMessage(ws, type, payload) {
    ws.send(JSON.stringify({ type, ...payload }));
}

function broadcastToRoom(roomId, type, payload) {
    const room = rooms[roomId];
    if (!room) return;

    room.players.forEach(player => {
        if (player.readyState === WebSocket.OPEN) {
            sendMessage(player, type, payload);
        }
    });
}

function generateScramble() {
    const faces = ["U", "D", "L", "R", "F", "B"];
    const modifiers = ["", "'", "2"];
    let scrambleSequence = [];
    let lastFace = -1;

    for (let i = 0; i < 3; i++) {
        let face_idx;
        do {
            face_idx = Math.floor(Math.random() * faces.length);
        } while (face_idx === lastFace);
        lastFace = face_idx;

        const mod_idx = Math.floor(Math.random() * modifiers.length);
        scrambleSequence.push(faces[face_idx] + modifiers[mod_idx]);
    }
    return scrambleSequence.join(' ');
}