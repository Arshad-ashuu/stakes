import React, { useState } from 'react';
import socket from '../socket';

const JoinRoom = ({ setRoomCode, setPlayerName }) => {
  const [localName, setLocalName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleJoinRoom = () => {
    if (!localName || !roomCodeInput) return;
    socket.emit('joinRoom', { roomCode: roomCodeInput, playerName: localName }, ({ error, success }) => {
      if (error) {
        alert(error);
      } else {
        setRoomCode(roomCodeInput);
        setPlayerName(localName);
      }
    });
  };

  return (
    <div>
      <h2>Join Room</h2>
      <input 
        type="text" 
        placeholder="Your Name" 
        value={localName} 
        onChange={(e) => setLocalName(e.target.value)} 
      />
      <input 
        type="text" 
        placeholder="Room Code" 
        value={roomCodeInput} 
        onChange={(e) => setRoomCodeInput(e.target.value)} 
      />
      <button onClick={handleJoinRoom}>Join Room</button>
    </div>
  );
};

export default JoinRoom;
