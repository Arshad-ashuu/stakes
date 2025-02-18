import React, { useState, useCallback, useMemo } from 'react';
import socket from '../socket';
import '../GameRoom.css';
import HostDashboard from './HostDashboard';

const GameRoom = ({ roomCode, playerName, isHost }) => {
  const [roomData, setRoomData] = useState({ hostName: '', players: {} });
  const [bid, setBid] = useState('');
  const [roundBids, setRoundBids] = useState({});
  const [roundMessage, setRoundMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Toast notification function
  const showToast = useCallback((message) => {
    setNotificationMessage(message);
    setShowNotification(true);

    // Hide toast after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  }, []);

  // Memoize the players data to avoid unnecessary re-renders
  const playersList = useMemo(() => roomData.players, [roomData]);

  // Handlers
  const handleDownloadResults = useCallback(() => {
    window.open(`https://stakes-ft.onrender.com/download/${roomCode}`, '_blank');
  }, [roomCode]);

  const handleStartRound = useCallback(() => {
    socket.emit('startRound', { roomCode }, (response) => {
      if (response.error) showToast(response.error);
    });
  }, [roomCode, showToast]);

  const handleSubmitBid = useCallback(() => {
    const bidAmount = parseInt(bid, 10);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      showToast('Please enter a valid bid amount min=10');
      return;
    }
    socket.emit('submitBid', { roomCode, bidAmount }, (response) => {
      if (response.error) showToast(response.error);
      else {
        setBid('');
        showToast(`Bid of ${bidAmount} submitted successfully`);
      }
    });
  }, [bid, roomCode, showToast]);

  const handleEvaluateBid = useCallback((playerId, isCorrect, originalBidAmount) => {
    socket.emit('evaluateBid', { roomCode, playerId, isCorrect }, (response) => {
      if (response.error) {
        showToast(response.error);
        return;
      }

      const updatedBid = roundBids[playerId]?.bidAmount;
      if (updatedBid !== originalBidAmount) {
        const bidDifference = updatedBid - originalBidAmount;
        const playerName = roomData.players[playerId]?.name;

        // Show toast message only if the bid has been changed (doubled or deducted)
        if (Math.abs(bidDifference) > 0) {
          const message = bidDifference > 0 
            ? `${playerName}'s bid was increased by ${bidDifference}.`
            : `${playerName}'s bid was decreased by ${Math.abs(bidDifference)}.`;

          // Show the notification to both host and the player
          if (isHost) {
            showToast(message);
          } else if (playerName === playerName) {
            showToast(message);
          }
        }
      }
    });
  }, [roomData, roundBids, roomCode, showToast, playerName]);

  // Socket event handlers
  const handleRoomUpdate = useCallback((data) => {
    setRoomData(data);

    // Show the toast if pointsChangeMessage is present
    if (data.pointsChangeMessage) {
      showToast(data.pointsChangeMessage);
    }
  }, [showToast]);

  const handleNewRound = useCallback(({ message }) => {
    setRoundMessage(message);
    setRoundBids({});
    showToast(message);
  }, [showToast]);

  const handleBidUpdate = useCallback((bids) => {
    setRoundBids(bids);
  }, []);

  const handleWinner = useCallback(({ winner }) => {
    showToast(`🏆 Winner: ${winner.name} wins the game!`);
  }, [showToast]);

  const handleRoomClosed = useCallback(() => {
    showToast('The room has been closed by the host.');
    setTimeout(() => window.location.reload(), 4000);
  }, [showToast]);

  // Setting up the socket listeners (run once when the component mounts)
  React.useEffect(() => {
    socket.on('roomUpdate', handleRoomUpdate);
    socket.on('newRound', handleNewRound);
    socket.on('bidUpdate', handleBidUpdate);
    socket.on('winner', handleWinner);
    socket.on('roomClosed', handleRoomClosed);

    return () => {
      socket.off('roomUpdate', handleRoomUpdate);
      socket.off('newRound', handleNewRound);
      socket.off('bidUpdate', handleBidUpdate);
      socket.off('winner', handleWinner);
      socket.off('roomClosed', handleRoomClosed);
    };
  }, [handleRoomUpdate, handleNewRound, handleBidUpdate, handleWinner, handleRoomClosed]);

  // Find the current player's ID from the players list
  const currentPlayerId = useMemo(() => {
    return Object.keys(playersList).find(id => playersList[id].name === playerName);
  }, [playersList, playerName]);

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

              {/* Show points only for the logged-in player */}
             
{currentPlayerId && playersList[currentPlayerId] && (
                <div className="player-points-display">
                  <span className="player-points">
                    {playersList[currentPlayerId].points==0 ? <h1 className='eliminated-text'>You are eliminated</h1>:(
                     <h1> Points: {playersList[currentPlayerId].points}</h1>
                    )}
                  </span>
                </div>
              )}

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
          {playersList && Object.keys(playersList).length > 0 ? (
            <div className="players-list">
              {Object.entries(playersList).map(([id, player]) => (
                <div key={id} className={`player-card ${player.eliminated ? 'eliminated' : ''}`}>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    {isHost && <span className="player-points">Points: {player.points}</span>}
                    {/* <span className="player-points">Points: {player.points}</span> */}
                    {player.eliminated && <span className="eliminated-badge">Eliminated</span>}
                  </div>
                  {isHost && !player.eliminated && roundBids[id] && !roundBids[id].evaluated && (
                    <div className="evaluation-buttons">
                      <button
                        className="evaluate-button correct"
                        onClick={() => handleEvaluateBid(id, true, roundBids[id].bidAmount)}
                      >
                        Correct
                      </button>
                      <button
                        className="evaluate-button incorrect"
                        onClick={() => handleEvaluateBid(id, false, roundBids[id].bidAmount)}
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

      {isHost && <button onClick={handleDownloadResults}>Download Results</button>}

      {isHost && <HostDashboard players={roomData.players} roundBids={roundBids} />}

      {showNotification && (
        <div className={`notification ${!showNotification ? 'fade-out' : ''}`}>
          {notificationMessage}
        </div>
      )}
    </div>
  );
};

export default GameRoom;
