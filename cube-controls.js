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

        // Map for middle layer moves and their internal AnimCube3.js codes
        const middleLayerMoveMap = {
            'M': { '': 100, "'": 102, '2': 101 },
            'S': { '': 52, "'": 54, '2': 53 },
            'E': { '': 28, "'": 30, '2': 29 }
        };

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
        } else if (middleLayerMoveMap[moveChar]) {
            let moveType = '';
            if (isInverse) moveType = "'";
            else if (isDouble) moveType = '2';

            const code = middleLayerMoveMap[moveChar][moveType];
            if (code !== undefined) {
                currentMoveSeq.push(code);
            } else {
                console.warn(`Unknown middle layer move combination: ${move}`);
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

// --- Move Deduction Logic (In-Memory Simulation) ---

const POSSIBLE_MOVES = [
    "U", "U'", "U2", "D", "D'", "D2",
    "R", "R'", "R2", "L", "L'", "L2",
    "F", "F'", "F2", "B", "B'", "B2",
    "M", "M'", "M2", "S", "S'", "S2",
    "E", "E'", "E2"
];

/**
 * Compares a before and after cube state to deduce the move that was performed
 * using a direct in-memory simulation strategy.
 * @param {Array<Array<number>>} beforeState The cube state before the move.
 * @param {Array<Array<number>>} afterState The cube state after the move.
 * @returns {string|null} The deduced move string (e.g., "U"), or null if no move is matched.
 */
function deduceMove(beforeState, afterState) {
    if (!beforeState || !afterState) {
        return null;
    }

    const afterString = JSON.stringify(afterState);
    if (JSON.stringify(beforeState) === afterString) {
        return null; // No change detected
    }

    // Ensure the required functions from AnimCube3.js are available
    if (typeof getMove !== 'function' || typeof doMove !== 'function') {
        console.error("deduceMove requires 'getMove' and 'doMove' functions from AnimCube3.js");
        return null;
    }

    for (const move of POSSIBLE_MOVES) {
        // 1. Create a deep copy of the state to simulate on
        const simulatedState = JSON.parse(JSON.stringify(beforeState));

        // 2. Convert the move string (e.g., "U") into a move sequence array
        const moveSequence = getMove(move, false)[0];

        // 3. Apply the move synchronously to our in-memory state array
        doMove(simulatedState, moveSequence, 0, moveSequence.length, false);

        // 4. Compare the result with the actual afterState
        if (JSON.stringify(simulatedState) === afterString) {
            return move; // Found it!
        }
    }

    console.warn("Could not deduce a single move from state change.", { beforeState, afterState });
    return null; // No single standard move matched
}

/**
 * Checks if the cube is in its solved state by comparing it to the initial state.
 * @param {string} cubeId The ID of the cube to check.
 * @returns {boolean} True if the cube is solved, false otherwise.
 */
function isCubeSolved(cubeId) {
    const currentState = acjs_cube[cubeId];
    const solvedState = acjs_initialCube[cubeId];

    if (!currentState || !solvedState) {
        console.error('Cube state for comparison is not available.');
        return false;
    }

    return JSON.stringify(currentState) === JSON.stringify(solvedState);
}

// --- WebSocket Integration (Placeholder) ---
// The WebSocket logic will now be handled in websocket-client.js
// We will make performMoves and Cube IDs available globally for websocket-client.js

window.CubeSim = window.CubeSim || {};
window.CubeSim.MY_CUBE_ID = MY_CUBE_ID;
window.CubeSim.OPPONENT_CUBE_ID = OPPONENT_CUBE_ID;
window.CubeSim.performMoves = performMoves;


// --- Event Listeners ---
document.getElementById('reset-btn').addEventListener('click', resetCubes);

const myCubeContainer = document.getElementById(MY_CUBE_ID);
let isDragging = false;
let beforeState = null; // Declare beforeState here

myCubeContainer.addEventListener('mousedown', function (event) {
    event.preventDefault();
    isDragging = true;
    // Store the cube's state *before* the drag
    if (typeof acjs_cube !== 'undefined' && acjs_cube[MY_CUBE_ID]) {
        beforeState = JSON.parse(JSON.stringify(acjs_cube[MY_CUBE_ID]));
        console.log('Mouse Down on My Cube. Stored beforeState.');
    } else {
        console.error('acjs_cube or acjs_cube[MY_CUBE_ID] is not defined.');
    }
});

myCubeContainer.addEventListener('mouseup', function (event) {
    if (isDragging) {
        isDragging = false;

        // Use a short timeout to allow AnimCube3.js to finalize the animation and update its internal state
        setTimeout(() => {
            if (typeof acjs_cube !== 'undefined' && acjs_cube[MY_CUBE_ID]) {
                const afterState = JSON.parse(JSON.stringify(acjs_cube[MY_CUBE_ID]));

                const deducedMove = deduceMove(beforeState, afterState);
                if (deducedMove) {
                    console.log('Deduced Move:', deducedMove);
                    // Send the move to the opponent via WebSocket
                    if (window.CubeSim && window.CubeSim.sendMoveToOpponent) {
                        window.CubeSim.sendMoveToOpponent(deducedMove);
                    }

                    // Check for win condition after a successful move
                    if (isCubeSolved(MY_CUBE_ID)) {
                        console.log('Cube is solved!');
                        if (window.CubeSim && window.CubeSim.notifyWin) {
                            window.CubeSim.notifyWin();
                        }
                    }
                } else {
                    console.warn('No single move deduced.');
                }
            } else {
                console.error('acjs_cube or acjs_cube[MY_CUBE_ID] is not defined at mouseup.');
            }
        }, 100); // 100ms delay
    }
});

// Simple keyboard listener to demonstrate sending moves
// A more robust solution would be needed to capture mouse moves