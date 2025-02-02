// server.js
import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';


const app = express();
app.use(cors());
app.use(express.json());


const server = http.createServer(app);
const io = new socketIo(server, { cors: { origin: '*' } });

/*
 In-memory store for rooms.
 Structure:
 {
   roomCode: {
     hostId,       // socket id of the host
     hostName,     // name of the host (for display purposes)
     players: {    // players in the room (host is not included here)
       socketId: { name, points, eliminated }
     },
     currentRound: { bids: { socketId: { bidAmount, evaluated, correct } } }
   }
 }
*/
const rooms = {};

// Helper: Generate a 6-character room code.
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper: Check if there is only one non-eliminated player remaining.
function checkForWinner(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  const remainingPlayers = Object.entries(room.players).filter(
    ([, player]) => !player.eliminated && player.points > 0
  );
  if (remainingPlayers.length === 1) {
    const [winnerId, winner] = remainingPlayers[0];
    // Emit a winner event to everyone in the room.
    io.to(roomCode).emit('winner', { winnerId, winner });
    console.log(`Winner in room ${roomCode}: ${winner.name}`);
    // Optionally, you can clean up or reset the room here.
  }
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create Room: The creator becomes the host (but is not added to the players list)
  socket.on('createRoom', ({ hostName }, callback) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      hostName,
      players: {},  // Only joining players will be stored here.
      currentRound: null,
    };
    socket.join(roomCode);
    callback({ roomCode });
    // Send an initial room update (host info is sent separately)
    io.to(roomCode).emit('roomUpdate', {
      hostName,
      players: rooms[roomCode].players,
    });
    console.log(`Room ${roomCode} created by host ${hostName}`);
  });

  // Join Room: New players get 100 points.
  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    if (!rooms[roomCode]) {
      callback({ error: 'Room not found' });
      return;
    }
    rooms[roomCode].players[socket.id] = {
      name: playerName,
      points: 100,
      eliminated: false,
    };
    socket.join(roomCode);
    callback({ success: true });
    // Send updated room info (including host info and players).
    io.to(roomCode).emit('roomUpdate', {
      hostName: rooms[roomCode].hostName,
      players: rooms[roomCode].players,
    });
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Host starts a new round.
  // The host simply signals that a new round is starting.
  socket.on('startRound', ({ roomCode }, callback) => {
    if (!rooms[roomCode]) {
      callback({ error: 'Room not found' });
      return;
    }
    // Only the host may start the round.
    if (rooms[roomCode].hostId !== socket.id) {
      callback({ error: 'Only the host can start a round' });
      return;
    }
    // Create a new round (no question stored since it is asked orally).
    rooms[roomCode].currentRound = { bids: {} };
    io.to(roomCode).emit('newRound', { message: 'Round started! Answer orally and place your bid.' });
    callback({ success: true });
    console.log(`New round started in room ${roomCode}`);
  });

  // Players submit bids for the current round.
  socket.on('submitBid', ({ roomCode, bidAmount }, callback) => {
    if (!rooms[roomCode] || !rooms[roomCode].currentRound) {
      callback({ error: 'No active round in this room' });
      return;
    }
    const player = rooms[roomCode].players[socket.id];
    if (!player || player.eliminated) {
      callback({ error: 'You are eliminated or not in the room' });
      return;
    }
    // Ensure the bid is valid (cannot exceed available points).
    if (bidAmount > player.points) {
      callback({ error: 'Bid exceeds available points' });
      return;
    }
    // Save the bid.
    rooms[roomCode].currentRound.bids[socket.id] = { bidAmount, evaluated: false, correct: null };
    io.to(roomCode).emit('bidUpdate', rooms[roomCode].currentRound.bids);
    callback({ success: true });
    console.log(`Bid submitted in room ${roomCode}: ${bidAmount} from ${socket.id}`);
  });

  // Host evaluates a bid as correct or incorrect.
  // If correct, the player gains points equal to the bid (doubling their bid).
  // If incorrect, the player loses that bid amount.
  // If a player's points drop to 0 or below, they are marked as eliminated.
  socket.on('evaluateBid', ({ roomCode, playerId, isCorrect }, callback) => {
    if (!rooms[roomCode] || rooms[roomCode].hostId !== socket.id) {
      callback({ error: 'Unauthorized' });
      return;
    }
    const round = rooms[roomCode].currentRound;
    if (!round || !round.bids[playerId]) {
      callback({ error: 'Bid not found' });
      return;
    }
    const bidRecord = round.bids[playerId];
    if (bidRecord.evaluated) {
      callback({ error: 'Bid already evaluated' });
      return;
    }
    bidRecord.evaluated = true;
    bidRecord.correct = isCorrect;

    const player = rooms[roomCode].players[playerId];
    const bidAmount = bidRecord.bidAmount;
    if (isCorrect) {
      // Player gains points equal to the bid.
      player.points += bidAmount;
    } else {
      // Subtract the bid amount.
      player.points -= bidAmount;
      // Mark as eliminated if points fall to 0 or below.
      if (player.points <= 0) {
        player.eliminated = true;
      }
    }

    io.to(roomCode).emit('roomUpdate', {
      hostName: rooms[roomCode].hostName,
      players: rooms[roomCode].players,
    });
    callback({ success: true });
    console.log(`Bid evaluated in room ${roomCode} for player ${playerId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);

    // After each evaluation, check for a winner.
    checkForWinner(roomCode);
  });

  // Clean up on disconnect.
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Loop through each room to see if the disconnected socket was in it.
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      // If the disconnected socket is the host, close the room.
      if (room.hostId === socket.id) {
        io.to(roomCode).emit('roomClosed');
        delete rooms[roomCode];
        console.log(`Room ${roomCode} closed (host disconnected).`);
      } else if (room.players[socket.id]) {
        // Otherwise, remove the player.
        delete room.players[socket.id];
        io.to(roomCode).emit('roomUpdate', {
          hostName: room.hostName,
          players: room.players,
        });
        console.log(`Player ${socket.id} removed from room ${roomCode}.`);
        // Check for a winner in case the disconnect affects the count.
        checkForWinner(roomCode);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
