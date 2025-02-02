// server.js
import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import ExcelJS from 'exceljs';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new socketIo(server, { cors: { origin: '*' } });

// In-memory store for rooms and game results
const rooms = {};
// We'll also store game history per room
// Structure: { roomCode: { hostName, gameResults: [ { round: X, bids: { playerId: { bidAmount, evaluated, correct, pointsAfter } } } ] } }

const gameHistory = {};

// Generate a 6-character room code
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
    io.to(roomCode).emit('winner', { winnerId, winner });
    console.log(`Winner in room ${roomCode}: ${winner.name}`);
  }
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create Room (host is not stored as a player)
  socket.on('createRoom', ({ hostName }, callback) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      hostName,
      players: {}, // players will be stored here
      currentRound: null,
    };
    // Initialize game history for this room
    gameHistory[roomCode] = {
      hostName,
      rounds: [] // Each round: { roundNumber, bids: { playerId: { bidAmount, evaluated, correct, pointsAfter } } }
    };

    socket.join(roomCode);
    callback({ roomCode });
    io.to(roomCode).emit('roomUpdate', {
      hostName,
      players: rooms[roomCode].players,
    });
    console.log(`Room ${roomCode} created by host ${hostName}`);
  });

  // Join Room: New player gets 100 points.
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
    io.to(roomCode).emit('roomUpdate', {
      hostName: rooms[roomCode].hostName,
      players: rooms[roomCode].players,
    });
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Host starts a new round.
  socket.on('startRound', ({ roomCode }, callback) => {
    if (!rooms[roomCode]) {
      callback({ error: 'Room not found' });
      return;
    }
    if (rooms[roomCode].hostId !== socket.id) {
      callback({ error: 'Only the host can start a round' });
      return;
    }
    // Create a new round.
    rooms[roomCode].currentRound = { bids: {} };
    io.to(roomCode).emit('newRound', { message: 'Round started! Answer orally and place your bid.' });
    callback({ success: true });
    console.log(`New round started in room ${roomCode}`);
  });

  // Players submit bids.
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
    if (bidAmount > player.points) {
      callback({ error: 'Bid exceeds available points' });
      return;
    }
    rooms[roomCode].currentRound.bids[socket.id] = { bidAmount, evaluated: false, correct: null };
    io.to(roomCode).emit('bidUpdate', rooms[roomCode].currentRound.bids);
    callback({ success: true });
    console.log(`Bid submitted in room ${roomCode}: ${bidAmount} from ${socket.id}`);
  });

  // Host evaluates a bid.
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
      player.points += bidAmount;
    } else {
      player.points -= bidAmount;
      if (player.points <= 0) {
        player.eliminated = true;
      }
    }
    // Save the result for this round.
    const roundIndex = gameHistory[roomCode].rounds.length + 1;
    gameHistory[roomCode].rounds.push({
      round: roundIndex,
      bids: {
        [playerId]: {
          bidAmount,
          evaluated: bidRecord.evaluated,
          correct: bidRecord.correct,
          pointsAfter: player.points,
        },
      },
    });

    io.to(roomCode).emit('roomUpdate', {
      hostName: rooms[roomCode].hostName,
      players: rooms[roomCode].players,
    });
    callback({ success: true });
    console.log(`Bid evaluated in room ${roomCode} for ${playerId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);

    checkForWinner(roomCode);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.hostId === socket.id) {
        io.to(roomCode).emit('roomClosed');
        delete rooms[roomCode];
        delete gameHistory[roomCode];
        console.log(`Room ${roomCode} closed (host disconnected).`);
      } else if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomCode).emit('roomUpdate', {
          hostName: room.hostName,
          players: room.players,
        });
        console.log(`Player ${socket.id} removed from room ${roomCode}.`);
        checkForWinner(roomCode);
      }
    }
  });
});

// Endpoint to download game results as an Excel file
app.get('/download/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  if (!gameHistory[roomCode]) {
    return res.status(404).send('Room not found or no game history available.');
  }

  try {
    // Create a new workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Game Results');

    // Define header row
    worksheet.columns = [
      { header: 'Room Name', key: 'room', width: 15 },
      { header: 'Player Name', key: 'player', width: 20 },
      { header: 'Round', key: 'round', width: 10 },
      { header: 'Bid Amount', key: 'bid', width: 15 },
      { header: 'Result', key: 'result', width: 15 },
      { header: 'Points After Round', key: 'points', width: 20 },
      { header: 'Winner', key: 'winner', width: 15 },
    ];

    const roomInfo = gameHistory[roomCode];
    const players = rooms[roomCode] ? rooms[roomCode].players : {};

    // Create a map of final winner (if any)
    let winnerName = '';
    const remainingPlayers = Object.values(players).filter(p => !p.eliminated && p.points > 0);
    if (remainingPlayers.length === 1) {
      winnerName = remainingPlayers[0].name;
    }

    // Loop through each round and add rows
    roomInfo.rounds.forEach(round => {
      Object.entries(round.bids).forEach(([playerId, bidData]) => {
        const playerName = players[playerId] ? players[playerId].name : 'Unknown';
        worksheet.addRow({
          room: roomCode,
          player: playerName,
          round: round.round,
          bid: bidData.bidAmount,
          result: bidData.correct ? 'Correct' : 'Incorrect',
          points: bidData.pointsAfter,
          winner: winnerName,
        });
      });
    });

    // Use host name instead of roomCode for file name.
    const hostName = roomInfo.hostName;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${hostName}_game_results.xlsx`);

    // Write the workbook to the response.
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating Excel file.');
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
