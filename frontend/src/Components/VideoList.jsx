import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (hasFetched.current) return;
      hasFetched.current = true;

    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        const username = document.cookie
          .split('; ')
          .find(row => row.startsWith('username='))
          ?.split('=')[1];

        setUsername(username);

        const response = await axios.get(`${apiUrl}/videos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (Array.isArray(response.data) && response.data.length > 0) {
          setVideos(response.data);
        } else if (typeof response.data === 'object' && Object.keys(response.data).length > 0) {
          setVideos(Object.values(response.data));
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError('Failed to fetch videos. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleViewVideo = (videoId) => {
    window.open(`/videoDetails.html?id=${videoId}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem' }}>Videos uploaded by {username}</h1>
        
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div>{error}</div>
        ) : videos.length > 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflowX: 'auto', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File ID</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Size</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Upload Time</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Type</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0' }}>{video.id}</td>
                    <td style={{ padding: '0.75rem 0' }}>{video.shortFileName}</td>
                    <td style={{ padding: '0.75rem 0' }}>{video.fileSize} bytes</td>
                    <td style={{ padding: '0.75rem 0' }}>{video.uploadTime}</td>
                    <td style={{ padding: '0.75rem 0' }}>{video.fileExtension}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      <button 
                        onClick={() => handleViewVideo(video.id)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No videos found. Your uploaded videos will appear here.</p>
        )}
        
        <button 
          onClick={() => navigate('/')}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
        >
          Back to Upload
        </button>
      </div>
    </div>
  );
};

export default VideoList;
