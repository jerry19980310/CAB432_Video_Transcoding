import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GoogleIcon from '../icons/GoogleIcon'; 
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

  const handleGoogleSignUp = () => {
    // Implement Google Sign-Up logic here
    console.log('Google Sign-Up clicked');
    // You would typically redirect to a Google OAuth URL or use a library like react-google-login
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
        <button onClick={handleGoogleSignUp} className="google-button">
          <GoogleIcon />
          Sign up with Google
        </button>
      </div>
    </div>
  );
};

export default SignUp;
