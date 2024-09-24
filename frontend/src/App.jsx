import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import ConfirmEmail from './Components/ConfirmEmail';
import Confirm from './Components/Confirm';
import VideoList from './Components/VideoList';
import UploadForm from './Components/UploadForm';
import UploadSuccess from './Components/UploadSuccess';

const isAuthenticated = () => {
  const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  return !!token;
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated() ? <Navigate to="/upload" /> : <Navigate to="/login" />} 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <UploadForm />
            </ProtectedRoute>
          } 
        />
        <Route path="/videolist" element={<VideoList />} />
        <Route path="/uploadsuccess" element={<UploadSuccess />} />
      </Routes>
    </Router>
  );
};

export default App;