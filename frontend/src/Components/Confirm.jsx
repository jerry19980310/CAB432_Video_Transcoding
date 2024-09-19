import React from 'react';
import { Link } from 'react-router-dom';

const Confirm = () => {
  return (
    <div className="confirm-container">
      <h2>Account Created Successfully!</h2>
      <p>Your account has been created. You can now log in.</p>
      <Link to="/login" className="login-link">Go to Login</Link>
    </div>
  );
};

export default Confirm;