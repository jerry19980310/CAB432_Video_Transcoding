import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleIcon from '../icons/GoogleIcon'; 
import { GoogleLogin } from '@react-oauth/google';
import '../styles/SignUp.css'; 

const SignUp = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (data.success) {
        navigate('/login', { state: { email } });
      } else {
        alert(data.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

 // Handle Google Sign-Up success
 const handleGoogleSuccess = async (credentialResponse) => {
  try {
    const { credential } = credentialResponse;
    // Send the credential to your backend for verification and user creation
    const res = await fetch(`${apiUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: credential }),
       credentials: 'include',
    });
    const data = await res.json();
    if (data.success) {
      // // Save tokens and navigate as needed
      // document.cookie = `token=${data.token}; path=/; max-age=1800; SameSite=None; Secure`;
      // document.cookie = `username=${data.username}; path=/; max-age=1800; SameSite=None; Secure`;
      navigate('/upload');
      console.log('Backend response data:', data);
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
        <h2 className="title">Create an account</h2>
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            Sign Up
          </button>
        </form>
        <Link to="/login" className="link">
          Already have an account? Log in
        </Link>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleFailure}
          ux_mode="popup"
          render={(renderProps) => (
            <button onClick={renderProps.onClick} className="google-button">
              <GoogleIcon />
              Sign up with Google
            </button>
          )}
        />
      </div>
    </div>
  );
};

export default SignUp;
