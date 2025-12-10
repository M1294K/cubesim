// --- WebSocket Integration ---
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = function(event) {
  console.log('WebSocket connection opened:', event);
};

socket.onmessage = function(event) {
  console.log('WebSocket message received:', event.data);
  const msg = JSON.parse(event.data);

  // Check if CubeSim is available and contains necessary functions/IDs
  if (window.CubeSim && window.CubeSim.performMoves) {
    if (msg.type === 'move') {
      // When a move is received from the opponent, apply it to their cube
      window.CubeSim.performMoves(window.CubeSim.OPPONENT_CUBE_ID, msg.move);
    } else if (msg.type === 'scramble') {
      // If the server sends a scramble, apply it to both cubes
      window.CubeSim.performMoves(window.CubeSim.MY_CUBE_ID, msg.sequence);
      window.CubeSim.performMoves(window.CubeSim.OPPONENT_CUBE_ID, msg.sequence);
    }
  } else {
    console.warn('CubeSim not fully initialized, cannot process WebSocket message.');
  }
};

socket.onclose = function(event) {
  console.log('WebSocket connection closed.');
};

socket.onerror = function(error) {
  console.error('WebSocket error:', error);
};

// Expose send functions globally via CubeSim namespace
window.CubeSim = window.CubeSim || {};
window.CubeSim.sendMoveToOpponent = function(move) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'move', move: move }));
  } else {
    console.warn('WebSocket not open. Cannot send move:', move);
  }
};

window.CubeSim.sendScrambleToOpponent = function(sequence) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'scramble', sequence: sequence }));
  } else {
    console.warn('WebSocket not open. Cannot send scramble:', sequence);
  }
};