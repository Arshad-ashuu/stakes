import React, { useState, useEffect } from 'react';
import socket from '../socket';
import '../GameRoom.css'

const GameRoom = ({ roomCode, playerName, isHost }) => {
  const [roomData, setRoomData] = useState({ hostName: '', players: {} });
  const [bid, setBid] = useState('');
  const [roundBids, setRoundBids] = useState({});
  const [roundMessage, setRoundMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    socket.on('roomUpdate', (data) => {
      setRoomData(data);
    });

    socket.on('newRound', ({ message }) => {
      setRoundMessage(message);
      setRoundBids({});
      showToast(message);
    });

    socket.on('bidUpdate', (bids) => {
      setRoundBids(bids);
    });

    socket.on('winner', ({ winner }) => {
      showToast(`🏆 Winner: ${winner.name} wins the game!`);
    });

    socket.on('roomClosed', () => {
      showToast('The room has been closed by the host.');
      setTimeout(() => window.location.reload(), 3000);
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('newRound');
      socket.off('bidUpdate');
      socket.off('winner');
      socket.off('roomClosed');
    };
  }, []);

  const showToast = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleStartRound = () => {
    socket.emit('startRound', { roomCode }, (response) => {
      if (response.error) showToast(response.error);
    });
  };

  const handleSubmitBid = () => {
    const bidAmount = parseInt(bid, 10);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      showToast('Please enter a valid bid amount');
      return;
    }
    socket.emit('submitBid', { roomCode, bidAmount }, (response) => {
      if (response.error) showToast(response.error);
      // else setBid('');
    });
  };

  const handleEvaluateBid = (playerId, isCorrect) => {
    socket.emit('evaluateBid', { roomCode, playerId, isCorrect }, (response) => {
      if (response.error) showToast(response.error);
    });
  };

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="room-info">
          <h1 className="room-code">Room Code: {roomCode}</h1>
          <div className="host-info">
            <span className="host-label">Host:</span>
            <span className="host-name">{roomData.hostName}</span>
          </div>
        </div>
        <div className="player-welcome">
          <h2>Welcome, {playerName}</h2>
          {isHost && <span className="host-badge">Host</span>}
        </div>
      </div>

      <div className="game-content">
        <div className="action-panel">
          {isHost ? (
            <div className="host-controls">
              <button className="primary-button start-button" onClick={handleStartRound}>
                Start New Round
              </button>
              {roundMessage && <div className="round-message">{roundMessage}</div>}
            </div>
          ) : (
            <div className="player-controls">
              <div className="round-status">
                {roundMessage || 'Waiting for the host to start the round...'}
              </div>
              <div className="bid-controls">
                <input
                  type="number"
                  className="bid-input"
                  placeholder="Enter your bid"
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                />
                <button className="primary-button" onClick={handleSubmitBid}>
                  Submit Bid
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="players-section">
          <h3 className="section-title">Players</h3>
          {roomData.players && Object.keys(roomData.players).length > 0 ? (
            <div className="players-list">
              {Object.entries(roomData.players).map(([id, player]) => (
                <div key={id} className={`player-card ${player.eliminated ? 'eliminated' : ''}`}>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-points">Points: {player.points}</span>
                    {player.eliminated && <span className="eliminated-badge">Eliminated</span>}
                  </div>
                  {isHost && !player.eliminated && roundBids[id] && !roundBids[id].evaluated && (
                    <div className="evaluation-buttons">
                      <button
                        className="evaluate-button correct"
                        onClick={() => handleEvaluateBid(id, true)}
                      >
                        Correct
                      </button>
                      <button
                        className="evaluate-button incorrect"
                        onClick={() => handleEvaluateBid(id, false)}
                      >
                        Incorrect
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-players">No players have joined yet</div>
          )}
        </div>

        {isHost && (
          <div className="bids-section">
            <h3 className="section-title">Round Bids</h3>
            <div className="bids-list">
              {roundBids && Object.entries(roundBids).map(([id, bidInfo]) => (
                <div key={id} className={`bid-card ${bidInfo.evaluated ? (bidInfo.correct ? 'correct' : 'incorrect') : ''}`}>
                  {roomData.players && roomData.players[id] && (
                    <>
                      <span className="bidder-name">{roomData.players[id].name}</span>
                      <span className="bid-amount">{bidInfo.bidAmount}</span>
                      {bidInfo.evaluated && (
                        <span className="bid-status">
                          {bidInfo.correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showNotification && (
        <div className="notification">
          {notificationMessage}
        </div>
      )}
    </div>
  );
};

export default GameRoom;