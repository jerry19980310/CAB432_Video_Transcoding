import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../styles/signup.css';

const SignUp = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    e.preventDefault();
  
    const data = {
      username,
      email,
      password
    };
  
    fetch('http://localhost:3001/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Success:', data);
        // Redirect after successful sign-up
        navigate('/confirm');
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };
  return (
    <div className="signup-container">
      <div className="signup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="white">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM10 17.5v-11l8.5 5.5-8.5 5.5z" />
        </svg>
      </div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#555">
              <path d="M12 12c2.209 0 4-1.791 4-4s-1.791-4-4-4-4 1.791-4 4 1.791 4 4 4zm0 2c-2.673 0-8 1.342-8 4v2h16v-2c0-2.658-5.327-4-8-4z" />
            </svg>
          </span>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#555">
              <path d="M12 12c2.209 0 4-1.791 4-4s-1.791-4-4-4-4 1.791-4 4 1.791 4 4 4zm0 2c-2.673 0-8 1.342-8 4v2h16v-2c0-2.658-5.327-4-8-4z" />
            </svg>
          </span>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#555">
              <path d="M12 2c-2.757 0-5 2.243-5 5v3H6v14h12V10h-1V7c0-2.757-2.243-5-5-5zm3 8H9V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3z" />
            </svg>
          </span>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#555">
              <path d="M12 2c-2.757 0-5 2.243-5 5v3H6v14h12V10h-1V7c0-2.757-2.243-5-5-5zm3 8H9V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3z" />
            </svg>
          </span>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <input type="submit" value="Sign Up" className="signup-button" />
      </form>
    </div>
  );
};

export default SignUp;