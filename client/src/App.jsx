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
        {/* <h1 className="title"><span className="t1">R</span><span className="t2">i</span><span className="t3">s</span><span className="t4">k</span><span> </span><span className="t5">I</span><span className="t6">t</span><span> </span><span className="t1">R</span><span className="t2">i</span><span className="t3">g</span><span className="t1">h</span><span className="t2">t</span></h1> */}
        <h1 className='title-sub'>TECHNOPHILIA <span className='text-minsub'>4.0</span></h1>
        <h1 className='title'>Risk it Right<img src='src\assets\emoji-mashup.png' alt='Technophilia-Logo' style={{width:'40px',height:'34px',marginLeft:'6px'}} /></h1>
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
