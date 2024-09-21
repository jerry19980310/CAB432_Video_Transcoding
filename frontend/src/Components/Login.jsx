import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/login.css';

const Login = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log(data);
      if (data.success) {
        console.log(data);
        document.cookie = `token=${data.token}; path=/; max-age=1800; SameSite=Strict`;
        document.cookie = `username=${data.username}; path=/; max-age=1800; SameSite=Strict`;
        console.log(document.cookie);
        navigate('/upload'); // Changed from '/main' to '/upload'
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-icon">
        {/* SVG icon */}
      </div>
      <h2>Welcome, please login</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-icon">
            {/* User icon SVG */}
          </span>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <span className="input-icon">
            {/* Password icon SVG */}
          </span>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
};

export default Login;