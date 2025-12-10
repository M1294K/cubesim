# CubeSim Project Goal

This document outlines the final objectives for the Interactive Cube Simulator project.

## Core Concept

The ultimate goal is to create a real-time, two-player cube battle game service. Users will be able to compete against each other to see who can solve a scrambled cube faster.

## Key Features

### 1. Advanced Cube Controls
- **Keyboard Input:** Continue to support cube manipulation via keyboard commands.
- **Mouse Drag Input:** Implement functionality to detect and interpret mouse drag movements on the cube. These movements must be translated into standard cube notation (e.g., "U", "R'", "F2") and transmitted to the opponent.

### 2. Game Lobby and Room Management
- **Room Creation:** Users should be able to create a new game room. Each room will have a unique identifier.
- **Room Joining:** Other users should be able to see a list of available rooms and join one to challenge another player.

### 3. Gameplay Flow
- **Ready System:** Inside a game room, both players must indicate they are "ready" to begin the match.
- **Synchronized Start:** Once both players are ready, the game will start simultaneously for both. A random scramble sequence will be applied to both players' cubes at the same time.
- **Real-time Updates:** As each player manipulates their cube, the moves will be sent to the opponent in real-time and displayed on their "Opponent" cube.
- **Win Condition:** The first player to solve their cube wins the match. (Further details on how to detect a "solved" state need to be defined).