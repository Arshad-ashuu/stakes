// src/components/HostDashboard.js
import React from 'react';

const HostDashboard = ({ players, roundBids }) => {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h3>Host Dashboard</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Player Name</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Current Points</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Bid Amount</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Bid Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(players).map(([id, player]) => {
            const bidInfo = roundBids[id] || {};
            const bidAmount = bidInfo.bidAmount !== undefined ? bidInfo.bidAmount : '-';
            const status = bidInfo.evaluated
              ? bidInfo.correct
                ? 'Correct'
                : 'Incorrect'
              : bidInfo.bidAmount !== undefined
              ? 'Pending'
              : 'No Bid';
            return (
              <tr key={id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '8px' }}>{player.name}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{player.points}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{bidAmount}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HostDashboard;
