import React, { useState, useEffect, useRef } from 'react';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [username, setUsername] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL;

  // Ref to track if fetchVideos has been called
  const hasFetched = useRef(false);

  // Fetch token from cookies
  const getTokenFromCookies = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  // Fetch username from cookies
  const getUserFromCookies = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('username='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  // Fetch videos function
  const fetchVideos = async () => {
    console.log('fetchVideos called');
    try {
      const usernameFromCookies = getUserFromCookies();
      const token = getTokenFromCookies();
      setUsername(usernameFromCookies);

      const response = await fetch(`${apiUrl}/videos`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setVideos(data);
      console.log('fetchVideos completed');
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    }
  };

  // Using useEffect to run fetchVideos on component mount
  useEffect(() => {
    console.log('useEffect called, hasFetched.current:', hasFetched.current);
    if (!hasFetched.current) {
      console.log('whyyy');
      fetchVideos();
      hasFetched.current = true;
      console.log('fetchVideos triggered');
    }
  }, []);
  
  return (
    <div className="video-list-container">
      <h2>Videos uploaded by {username}</h2>
      <ul>
        {videos.map((video) => (
          <li key={video.id}>
            <div className="video-info">
              <a href={`/videoactions/${video.id}`} target="_blank" rel="noreferrer">
                <strong>File ID:</strong> {video.id}
              </a>
            </div>
            <div className="video-info">
              <strong>File Name:</strong> {video.shortFileName}
            </div>
            <div className="video-info">
              <strong>File Size:</strong> {video.fileSize} bytes
            </div>
            <div className="video-info">
              <strong>File Type:</strong> {video.fileExtension}
            </div>
            <div className="video-info">
              <strong>Upload Date:</strong> {video.uploadTime}
            </div>
            <div className="video-info">
              <strong>Upload Path:</strong> {video.uploadPath}
            </div>
            <div className="video-info">
              <strong>Video Owner:</strong> {video.userName}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VideoList;