import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleIcon from '../icons/GoogleIcon'; 
import '../styles/Login.css';
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: '3bgk2gkfv98fffljc569sbjhqg',
      userPoolId: 'ap-southeast-2_4b5hIv0zn',
      loginWith: { // Optional
        oauth: {
          domain: 'n11428911-a2.auth.ap-southeast-2.amazoncognito.com',
          scopes: ['openid','email','profile'],
          redirectSignIn: ['http://localhost:3000/upload/'],
          redirectSignOut: ['http://localhost:3000/'],
          responseType: 'code',
        },
        username: 'true',
      }
    }
  }
});

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
      if (data.success) {
        document.cookie = `token=${data.data.idToken}; path=/; max-age=1800; SameSite=Strict`;
        document.cookie = `username=${data.data.username}; path=/; max-age=1800; SameSite=Strict`;
        navigate('/upload');
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    // Implement Google Login logic here
    window.location.href = 'https://n11428911-a2.auth.ap-southeast-2.amazoncognito.com/oauth2/authorize?client_id=3bgk2gkfv98fffljc569sbjhqg&response_type=token&scope=email+openid+profile&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fupload';
    console.log('Google Login clicked');
    // You would typically redirect to a Google OAuth URL or use a library like react-google-login
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
        <button onClick={handleGoogleLogin} className="google-button">
          <GoogleIcon />
          Login with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
