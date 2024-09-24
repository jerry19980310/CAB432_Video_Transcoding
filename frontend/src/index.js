import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/index.css';



const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="802478067725-ggcjdfr5dnjciqum2r6eik0qq52elcno.apps.googleusercontent.com">
    <React.StrictMode>
    <App />
  </React.StrictMode>
  </GoogleOAuthProvider>
);
