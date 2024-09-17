import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../styles/signup.css';

const Confirm = () => {

  const [confirmCode, setConfirmCode] = useState('');
  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    navigate('/login');
    // e.preventDefault();
  
    // const data = {
    //   confirmCode
    // };
  
    // fetch('http://localhost:3001/api/signup', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(data)
    // })
    //   .then((response) => {
    //     if (!response.ok) {
    //       throw new Error(`HTTP error! status: ${response.status}`);
    //     }
    //     return response.json();
    //   })
    //   .then((data) => {
    //     console.log('Success:', data);
    //     // Redirect after successful sign-up
    //     window.location.href = '/confirm';
    //   })
    //   .catch((error) => {
    //     console.error('Error:', error);
    //   });
  };
  return (
    <div className="signup-container">
      <div className="signup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="white">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM10 17.5v-11l8.5 5.5-8.5 5.5z" />
        </svg>
      </div>
      <h2>Confirm</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#555">
              <path d="M12 2c-2.757 0-5 2.243-5 5v3H6v14h12V10h-1V7c0-2.757-2.243-5-5-5zm3 8H9V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3z" />
            </svg>
          </span>
          <input
            type="confirmCode"
            name="confirmCode"
            placeholder="Confirm Code"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            required
          />
        </div>
        <input type="submit" value="Confirm" className="signup-button" />
      </form>
    </div>
  );
};

export default Confirm;