import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';


const ConfirmEmail = () => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, confirmationCode }),
      });
      const data = await response.json();
      if (data.success) {
        navigate('/confirm');
      } else {
        alert(data.message || 'Email confirmation failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="confirm-email-container">
      <h2>Confirm Your Email</h2>
      <p>Please enter the confirmation code sent to {email}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Confirmation Code"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          required
        />
        <button type="submit">Confirm Email</button>
      </form>
    </div>
  );
};

export default ConfirmEmail;