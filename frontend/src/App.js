import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import Confirm from './Components/Confirm';
import Main from './Components/Main';
import VideoList from './Components/VideoList';
import VideoActions from './Components/VideoActions';
import UploadForm from './Components/UploadForm';
import UploadSuccess from './Components/UploadSuccess';

const isAuthenticated = () => {
  const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  return !!token;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated() ? <Navigate to="/main" /> : <Navigate to="/login" />} 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/main" element={<Main />} />
        <Route path="/videolist" element={<VideoList />} />
        <Route path="/videoactions/:id" element={<VideoActions />} />
        <Route path="/upload" element={<UploadForm />} />
        <Route path="/uploadsuccess" element={<UploadSuccess />} />
      </Routes>
    </Router>
  );
};

export default App;