// src/socket.js
import { io } from 'socket.io-client';
const socket = io('https://stakes-ft.onrender.com');
//  const socket = io('http://localhost:5000'); // Adjust URL/port as needed.
export default socket;
