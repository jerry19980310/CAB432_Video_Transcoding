import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import TranscodeModal from './TranscodeModal';
import Notification from './Notification';
import TranscodeIcon from '../icons/TranscodeIcon';
import DownloadIcon from '../icons/DownloadIcon';
import RenameIcon from '../icons/RenameIcon';
import DeleteIcon from '../icons/DeleteIcon';
import '../styles/VideoList.css'; 

function VideoList() {
  const [videos, setVideos] = useState([]);
  const [username, setUsername] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const [isTranscodeModalOpen, setIsTranscodeModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const getTokenFromCookies = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  const getUserFromCookies = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('username='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  const fetchVideos = async () => {
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
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      fetchVideos();
      hasFetched.current = true;
    }
  }, []);

  const handleLogout = () => {
    const deleteCookie = (name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict`;
    };
    deleteCookie('token');
    deleteCookie('username');
    navigate('/login');
  };

  const handleAction = async (action, fileName) => {
    const token = getTokenFromCookies();

    try {
      switch (action) {
        case 'delete':
          await handleDelete(fileName, token);
          break;
        case 'rename':
          await handleRename(fileName, token);
          break;
        case 'download':
          await handleDownload(fileName, token);
          break;
        case 'transcode':
          setSelectedVideoId(fileName);
          setIsTranscodeModalOpen(true);
          break;
        default:
          console.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      setNotification({ message: `Failed to ${action} the video. Please try again.`, type: 'error' });
    }
  };

  const handleDelete = async (videoId, token) => {
    const isConfirmed = window.confirm('Are you sure you want to delete this video?');
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${apiUrl}/delete/${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ message: data.message || 'Video deleted successfully.', type: 'success' });
        fetchVideos();
      } else {
        setNotification({ message: data.message || 'Failed to delete video.', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      setNotification({ message: 'An error occurred while deleting the video. Please try again later.', type: 'error' });
    }
  };

  const handleRename = async (videoId, token) => {
    const newName = window.prompt('Enter the new name for the video:');
    if (!newName) return;

    try {
      const response = await fetch(`${apiUrl}/rename/${videoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newName }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ message: data.message || 'Video renamed successfully.', type: 'success' });
        fetchVideos();
      } else {
        setNotification({ message: data.message || 'Failed to rename video.', type: 'error' });
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      setNotification({ message: 'An error occurred while renaming the video. Please try again later.', type: 'error' });
    }
  };

  const handleDownload = async (fileName, token) => {
    try {
      const response = await fetch(
        `${apiUrl}/generate-download-url?key=uploads/${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate download URL.');
      }

      const data = await response.json();
      const downloadUrl = data.url;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading video:', error);
      setNotification({ message: 'Failed to download the video. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="video-list-container">
      <div className="video-list-content">
        <Header showUploadButton={true} handleLogout={handleLogout} />
        {/* Transcode Modal */}
        {isTranscodeModalOpen && (
          <TranscodeModal
            videoId={selectedVideoId}
            onClose={() => setIsTranscodeModalOpen(false)}
            onTranscodeComplete={() => {
              setIsTranscodeModalOpen(false);
              fetchVideos();
            }}
            token={getTokenFromCookies()}
            apiUrl={apiUrl}
          />
        )}
        {/* Notification */}
        {notification.message && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification({ message: '', type: '' })}
          />
        )}
        <main className="video-list-main">
          <h1 className="video-list-heading">Videos uploaded by {username}</h1>

          <div className="video-list-table-container">
            <table className="video-list-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Size</th>
                  <th>File Type</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td className="video-list-file-name">{video.fileName}</td>
                    <td>{video.fileSize} bytes</td>
                    <td>{video.fileExtension}</td>
                    <td>{new Date(video.uploadTime).toLocaleString()}</td>
                    <td>
                      <div className="video-list-actions">
                        <button
                          onClick={() => handleAction('transcode', video.id)}
                          className="video-list-action-button"
                          aria-label="Transcode video"
                        >
                          <TranscodeIcon />
                        </button>
                        <button
                          onClick={() => handleAction('download', video.fileName)}
                          className="video-list-action-button download"
                          aria-label="Download video"
                        >
                          <DownloadIcon />
                        </button>
                        <button
                          onClick={() => handleAction('rename', video.id)}
                          className="video-list-action-button rename"
                          aria-label="Rename video"
                        >
                          <RenameIcon />
                        </button>
                        <button
                          onClick={() => handleAction('delete', video.id)}
                          className="video-list-action-button delete"
                          aria-label="Delete video"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default VideoList;
