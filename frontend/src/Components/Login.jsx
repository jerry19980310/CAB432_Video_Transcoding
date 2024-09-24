import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleIcon from '../icons/GoogleIcon'; 
import { GoogleLogin } from '@react-oauth/google';
import '../styles/Login.css';

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
      console.log(data)
      if (data.success) {
        document.cookie = `token=${data.idToken}; path=/; max-age=1800; SameSite=Strict`;
        document.cookie = `username=${data.username}; path=/; max-age=1800; SameSite=Strict`;
        console.log(document.cookie)
        navigate('/upload');
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Handle Google Login success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      // Send the credential to your backend for verification and user login
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credential }),
      });
      const data = await res.json();
      if (data.success) {
        // Save tokens and navigate as needed
        document.cookie = `token=${data.token}; path=/; max-age=1800; SameSite=Strict`;
        document.cookie = `username=${data.username}; path=/; max-age=1800; SameSite=Strict`;
        navigate('/upload');
      } else {
        alert(data.message || 'Google Sign-In failed. Please try again.');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      alert('An error occurred during Google Sign-In. Please try again.');
    }
  };

  // Handle Google Sign-In failure
  const handleGoogleFailure = (error) => {
    console.error('Google Sign-In Failure:', error);
    alert('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="container">
      <div className="form-container">
        <h2 className="title">Welcome, please login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
          <button type="submit" className="button">
            Login
          </button>
        </form>
        <Link to="/signup" className="link">
          Don't have an account? Sign up
        </Link>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleFailure}
          ux_mode="popup"
          render={(renderProps) => (
            <button onClick={renderProps.onClick} className="google-button">
              <GoogleIcon />
              Login with Google
            </button>
          )}
        />
      </div>
    </div>
  );
};

export default Login;
