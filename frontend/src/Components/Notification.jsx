// Notification.js
import React from 'react';

function Notification({ message, type, onClose }) {
  const backgroundColors = {
    success: '#d1fae5',
    error: '#fee2e2',
    info: '#bfdbfe',
  };

  const textColors = {
    success: '#065f46',
    error: '#991b1b',
    info: '#1e3a8a',
  };

  return (
    <div
      style={{
        backgroundColor: backgroundColors[type] || '#d1fae5',
        padding: '0.75rem 1rem',
        borderRadius: '0.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
    >
      <p style={{ color: textColors[type] || '#065f46', margin: 0 }}>{message}</p>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: textColors[type] || '#065f46',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        &times;
      </button>
    </div>
  );
}

export default Notification;
