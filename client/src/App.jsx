import React, { useState } from 'react';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import GameRoom from './components/GameRoom';
import './App.css'; // Importing the CSS file

function App() {
  const [roomCode, setRoomCode] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);

  if (!roomCode) {
    return (
      <div className="app-container">
        <h1 className="title"><span className="t1">S</span><span className="t2">t</span><span className="t3">a</span><span className="t4">k</span><span className="t5">e</span> 🎰🎉</h1>
        <CreateRoom setRoomCode={setRoomCode} setPlayerName={setPlayerName} setIsHost={setIsHost} />
        <hr className="divider" />
        <JoinRoom setRoomCode={setRoomCode} setPlayerName={setPlayerName} />
      </div>
    );
  } else {
    return (
      <GameRoom roomCode={roomCode} playerName={playerName} isHost={isHost} />
    );
  }
}

export default App;
