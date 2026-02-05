const WebSocket = require('ws');

// Connect two clients
const ws1 = new WebSocket('ws://localhost:8080');
const ws2 = new WebSocket('ws://localhost:8080');

let ws1Open = false;
let ws2Open = false;
let roomId = null;
let ws1Id = null;
let ws2Id = null;

function checkDone() {
    if (ws1Open && ws2Open) {
        console.log('Both clients connected. Starting test flow...');
        startTest();
    }
}

ws1.on('open', () => { ws1Open = true; checkDone(); });
ws2.on('open', () => { ws2Open = true; checkDone(); });

ws1.on('message', (data) => handleMessage('Client 1', ws1, JSON.parse(data)));
ws2.on('message', (data) => handleMessage('Client 2', ws2, JSON.parse(data)));

function handleMessage(name, ws, msg) {
    console.log(`[${name}] Received: ${msg.type}`, msg);

    if (msg.type === 'connected') {
        if (name === 'Client 1') ws1Id = msg.clientId;
        if (name === 'Client 2') ws2Id = msg.clientId;
    } else if (msg.type === 'roomCreated') {
        roomId = msg.roomId;
        console.log(`[${name}] Room created: ${roomId}. Client 2 joining...`);
        ws2.send(JSON.stringify({ type: 'joinRoom', roomId: roomId }));
    } else if (msg.type === 'playerJoined') {
        if (msg.playerCount === 2) {
            console.log(`Players matched. Sending READY...`);
            ws1.send(JSON.stringify({ type: 'playerReady' }));
            ws2.send(JSON.stringify({ type: 'playerReady' }));
        }
    } else if (msg.type === 'allPlayersReady') {
        console.log(`All Ready. Starting Game...`);
        ws1.send(JSON.stringify({ type: 'startGame' }));
    } else if (msg.type === 'gameStarted') {
        if (name === 'Client 1') {
            console.log(`Game Started. Simulating Client 1 WIN...`);
            // Wait a sec then win
            setTimeout(() => {
                ws1.send(JSON.stringify({ type: 'gameWon' }));
            }, 1000);
        }
    } else if (msg.type === 'gameOver') {
        console.log(`SUCCESS: [${name}] received GAME OVER.`);
        if (msg.winnerId === ws1Id) {
            console.log(`Winner ID matches Client 1.`);
        }
        process.exit(0); // Success
    }
}

function startTest() {
    console.log('Client 1 Creating room...');
    ws1.send(JSON.stringify({ type: 'createRoom' }));
}

// Timeout fail
setTimeout(() => {
    console.error('Test Timed Out - Broadcast Failed?');
    process.exit(1);
}, 10000);
