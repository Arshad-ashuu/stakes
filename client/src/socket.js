// src/socket.js
import { io } from 'socket.io-client';
const socket = io('https://stakes-ft.onrender.com', {
  transports: ['websocket'], // Ensure WebSocket transport is prioritized
  reconnection: true,        // Enable automatic reconnection
  reconnectionAttempts: 5,    // Try reconnecting 5 times
  reconnectionDelay: 2000,    // Wait 2 seconds before retrying
  reconnectionDelayMax: 10000 // Max delay for retries
});

//   const socket = io('http://localhost:5000', {
//     transports: ['websocket'], // Ensure WebSocket transport is prioritized
//     reconnection: true,        // Enable automatic reconnection
//     reconnectionAttempts: 5,    // Try reconnecting 5 times
//     reconnectionDelay: 2000,    // Wait 2 seconds before retrying
//     reconnectionDelayMax: 10000 // Max delay for retries
//   });
   // Adjust URL/port as needed.
export default socket;
