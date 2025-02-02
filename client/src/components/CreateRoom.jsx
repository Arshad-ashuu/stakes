import React, { useState } from 'react';
import socket from '../socket';

const CreateRoom = ({ setRoomCode, setPlayerName, setIsHost }) => {
  const [hostName, setHostName] = useState('');

  const handleCreateRoom = () => {
    if (!hostName) return;
    socket.emit('createRoom', { hostName }, ({ roomCode, error }) => {
      if (error) {
        alert(error);
      } else {
        setRoomCode(roomCode);
        setPlayerName(hostName);
        setIsHost(true);
      }
    });
  };

  return (
    <div>
      <h2>Create Room (You are the host)</h2>
      <input 
        type="text" 
        placeholder="Your Name" 
        value={hostName} 
        onChange={(e) => setHostName(e.target.value)} 
      />
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
};

export default CreateRoom;
