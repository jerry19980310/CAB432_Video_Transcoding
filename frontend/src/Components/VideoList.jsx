import React, { useState, useEffect } from 'react';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [username, setUsername] = useState('');

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
  const fetchVideos = () => {
    const username = getUserFromCookies();
    const token = getTokenFromCookies();
    setUsername(username);

    fetch(`/videos/${username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        setVideos(data);
      })
      .catch((error) => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  // Using useEffect to run fetchVideos on component mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]); // Add fetchVideos as a dependency

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
