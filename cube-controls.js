// --- Cube Setup ---
    const MY_CUBE_ID = 'my_cube_container';
    const OPPONENT_CUBE_ID = 'opponent_cube_container';

    // Opponent's cube (left, non-interactive)
    var opponentCube = new AnimCube3('id=' + OPPONENT_CUBE_ID + '&initmove=x2z-1&speed=1&hint=3&buttonbar=0&counter=0&edit=0');

    // My cube (right, interactive)
    var myCube = new AnimCube3('id=' + MY_CUBE_ID + '&initmove=x2z-1&speed=1&hint=3&buttonbar=0&counter=0');


    // --- Helper functions using the captured internals ---

    /**
     * Performs a sequence of moves on a specified cube.
     * @param {string} cubeId The ID of the cube container to apply moves to.
     * @param {string} moveStr A space-separated string of moves (e.g., "U R' F2").
     */
    function performMoves(cubeId, moveStr) {
      if (acjs_animating[cubeId]) return;
      var moves = moveStr.split(' ');

      // Ensure the move sequence array for the current move is initialized
      if (typeof acjs_move[cubeId][acjs_curMove[cubeId]] === 'undefined') {
        acjs_move[cubeId][acjs_curMove[cubeId]] = [];
      }
      var currentMoveSeq = acjs_move[cubeId][acjs_curMove[cubeId]];

      for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        if (move === '') continue;

        var moveChar = move.charAt(0);
        var isInverse = move.length > 1 && move.charAt(1) === "'";
        var isDouble = move.length > 1 && move.charAt(1) === '2';

        var faceMoveCode = "UDFBLR".indexOf(moveChar);
        var bodyMoveCode = "xyz".indexOf(moveChar);

        if (faceMoveCode !== -1) {
          var modifier = isInverse ? 2 : (isDouble ? 1 : 0);
          currentMoveSeq.push(24 * faceMoveCode + modifier);
        } else if (bodyMoveCode !== -1) {
          var moveCodeValue;
          if (moveChar === 'y') { moveCodeValue = 56; }
          else if (moveChar === 'x') { moveCodeValue = 32; }
          else if (moveChar === 'z') { moveCodeValue = 104; }

          if (moveCodeValue) {
            var modifier = isInverse ? 2 : (isDouble ? 1 : 0);
            currentMoveSeq.push(moveCodeValue + modifier);
          }
        }
      }

      acjs_startAnimation[cubeId](-1);
    }

    /**
     * Resets both cubes to their initial solved state.
     */
    function resetCubes() {
      if (acjs_clear[MY_CUBE_ID]) {
        acjs_clear[MY_CUBE_ID]();
      }
      if (acjs_clear[OPPONENT_CUBE_ID]) {
        acjs_clear[OPPONENT_CUBE_ID]();
      }
    }

    /**
     * Generates a random scramble sequence and applies it to both cubes.
     */
    function scrambleCubes() {
      if (acjs_animating[MY_CUBE_ID] || acjs_animating[OPPONENT_CUBE_ID]) return;

      var faces = ["U", "D", "L", "R", "F", "B"];
      var modifiers = ["", "'", "2"];
      var scrambleSequence = [];
      var lastFace = -1;

      for (var i = 0; i < 25; i++) {
        var face_idx;
        do {
          face_idx = Math.floor(Math.random() * faces.length);
        } while (face_idx === lastFace);
        lastFace = face_idx;

        var mod_idx = Math.floor(Math.random() * modifiers.length);
        scrambleSequence.push(faces[face_idx] + modifiers[mod_idx]);
      }

      const scrambleString = scrambleSequence.join(' ');

      // Apply the same scramble to both cubes
      performMoves(MY_CUBE_ID, scrambleString);
      performMoves(OPPONENT_CUBE_ID, scrambleString);

      // Send the scrambleString to the opponent via WebSocket
      if (window.CubeSim && window.CubeSim.sendScrambleToOpponent) {
          window.CubeSim.sendScrambleToOpponent(scrambleString);
      }
    }

    // --- WebSocket Integration (Placeholder) ---
    // The WebSocket logic will now be handled in websocket-client.js
    // We will make performMoves and Cube IDs available globally for websocket-client.js

    window.CubeSim = window.CubeSim || {};
    window.CubeSim.MY_CUBE_ID = MY_CUBE_ID;
    window.CubeSim.OPPONENT_CUBE_ID = OPPONENT_CUBE_ID;
    window.CubeSim.performMoves = performMoves;


    // --- Event Listeners ---
    document.getElementById('scramble-btn').addEventListener('click', scrambleCubes);
    document.getElementById('reset-btn').addEventListener('click', resetCubes);

    // Simple keyboard listener to demonstrate sending moves
    // A more robust solution would be needed to capture mouse moves
    document.addEventListener('keydown', function (event) {
      const moveMap = {
        'U': "U", 'u': "U'",
        'D': "D", 'd': "D'",
        'R': "R", 'r': "R'",
        'L': "L", 'l': "L'",
        'F': "F", 'f': "F'",
        'B': "B", 'b': "B'"
      };
      const move = moveMap[event.key];
      if (move) {
        event.preventDefault(); // Prevent browser shortcuts

        // Apply the move to my cube
        performMoves(MY_CUBE_ID, move);

        // Send the move to the opponent via WebSocket
        if (window.CubeSim && window.CubeSim.sendMoveToOpponent) {
            window.CubeSim.sendMoveToOpponent(move);
        }
        console.log('Sent move:', move);
      }
    });