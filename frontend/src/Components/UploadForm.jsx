// UploadForm.js
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import UploadIcon from '../icons/UploadIcon'; 
import 'lite-youtube-embed/src/lite-yt-embed.css';
import 'lite-youtube-embed';
import '../styles/UploadForm.css'; 

if (typeof window !== 'undefined') {
  import('lite-youtube-embed');
}

const UploadForm = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [relatedVideos, setRelatedVideos] = useState([]);
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);

  const handleFileChange = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!file) {
        setUploadMessage('Please select a file to upload.');
        return;
      }

      try {
        setUploadMessage('Requesting upload URL...');

        const response = await fetch(
          `${apiUrl}/generate-upload-url?fileName=${encodeURIComponent(
            file.name
          )}&fileType=${encodeURIComponent(file.type)}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to get upload URL: ${response.statusText}`);
        }

        const { url: uploadUrl, key } = await response.json();

        if (!uploadUrl || !key) {
          throw new Error('Invalid upload URL or key received from server.');
        }

        setUploadMessage('Uploading to S3...');

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file to S3: ${uploadResponse.statusText}`);
        }

        setUploadMessage('Upload to S3 successful. Notifying server...');

        const getUserFromCookies = () => {
          const cookieValue = document.cookie
            .split('; ')
            .find((row) => row.startsWith('username='))
            ?.split('=')[1];
          return cookieValue || '';
        };
        const userName = getUserFromCookies();
        const notifyResponse = await fetch(`${apiUrl}/upload-complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            key: key,
            userName: userName,
          }),
        });

        if (!notifyResponse.ok) {
          throw new Error(`Failed to notify server: ${notifyResponse.statusText}`);
        }

        const notifyData = await notifyResponse.json();

        if (notifyData.message && notifyData.fileName) {
          setUploadMessage(`${notifyData.fileName} uploaded successfully!`);
          setVideos((prevVideos) => [
            ...prevVideos,
            {
              id: prevVideos.length + 1,
              fileName: notifyData.fileName,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
              uploadTime: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }),
            },
          ]);
        }

        if (notifyData.relatedVideos) {
          setRelatedVideos(notifyData.relatedVideos);
        }
      } catch (error) {
        console.error('Error:', error);
        setUploadMessage(`Error: ${error.message}`);
      }
    },
    [file, apiUrl]
  );

  const handleLogout = useCallback(() => {
    const deleteCookie = (name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict`;
    };
    deleteCookie('token');
    deleteCookie('username');
    navigate('/login');
  }, [navigate]);

  const handleViewVideo = useCallback((fileName) => {
    console.log(`View video: ${fileName}`);
    // Implement view functionality here
  }, []);

  return (
    <div className="upload-form-container">
      <div className="upload-form-content">
        <Header showUploadButton={false} handleLogout={handleLogout} />

        <main className="upload-form-main">
          <h1 className="upload-form-heading">Upload Your Video</h1>

          <div className="upload-form">
            <form onSubmit={handleSubmit}>
              <div className="upload-form-input-group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="upload-form-input"
                />
                <button type="submit" className="upload-form-button">
                  <UploadIcon />
                  Upload
                </button>
              </div>
            </form>
            {uploadMessage && (
              <p className="upload-form-upload-message">{uploadMessage}</p>
            )}
          </div>

          <div className="videos-table-container">
            <h2 className="videos-table-heading">My Videos</h2>
            <table className="videos-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Size</th>
                  <th>Upload Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td>{video.fileName}</td>
                    <td>{video.fileSize}</td>
                    <td>{video.uploadTime}</td>
                    <td>
                      <button
                        onClick={() => handleViewVideo(video.fileName)}
                        className="videos-table-action-button"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {relatedVideos.length > 0 && (
            <div className="related-videos-container">
              <h3 className="related-videos-heading">Related YouTube Videos</h3>
              <div className="related-videos-grid">
                {relatedVideos.map((video) => (
                  <div key={video.videoId} className="related-video-card">
                    <lite-youtube
                      videoid={video.videoId}
                      className="lite-youtube"
                    ></lite-youtube>
                    <div className="related-video-title">
                      <p>{video.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UploadForm;
