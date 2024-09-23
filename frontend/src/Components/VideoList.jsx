// import React, { useState, useEffect, useRef } from 'react';

// const VideoList = () => {
//   const [videos, setVideos] = useState([]);
//   const [username, setUsername] = useState('');
//   const apiUrl = process.env.REACT_APP_API_URL;

//   // Ref to track if fetchVideos has been called
//   const hasFetched = useRef(false);

//   // Fetch token from cookies
//   const getTokenFromCookies = () => {
//     const cookieValue = document.cookie
//       .split('; ')
//       .find((row) => row.startsWith('token='))
//       ?.split('=')[1];
//     return cookieValue || '';
//   };

//   // Fetch username from cookies
//   const getUserFromCookies = () => {
//     const cookieValue = document.cookie
//       .split('; ')
//       .find((row) => row.startsWith('username='))
//       ?.split('=')[1];
//     return cookieValue || '';
//   };

//   // Fetch videos function
//   const fetchVideos = async () => {
//     console.log('fetchVideos called');
//     try {
//       const usernameFromCookies = getUserFromCookies();
//       const token = getTokenFromCookies();
//       setUsername(usernameFromCookies);

//       const response = await fetch(`${apiUrl}/videos`, {
//         method: 'GET',
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         credentials: 'include',
//       });

//       if (!response.ok) {
//         throw new Error('Network response was not ok');
//       }

//       const data = await response.json();
//       setVideos(data);
//       console.log('fetchVideos completed');
//     } catch (error) {
//       console.error('There was a problem with the fetch operation:', error);
//     }
//   };

//   // Using useEffect to run fetchVideos on component mount
//   useEffect(() => {
//     console.log('useEffect called, hasFetched.current:', hasFetched.current);
//     if (!hasFetched.current) {
//       console.log('whyyy');
//       fetchVideos();
//       hasFetched.current = true;
//       console.log('fetchVideos triggered');
//     }
//   }, []);
  
//   return (
//     <div className="video-list-container">
//       <h2>Videos uploaded by {username}</h2>
//       <ul>
//         {videos.map((video) => (
//           <li key={video.id}>
//             <div className="video-info">
//               <a href={`/videoactions/${video.fileName}`} target="_blank" rel="noreferrer">
//                 <strong>File ID:</strong> {video.id}
//               </a>
//             </div>
//             <div className="video-info">
//               <strong>File Name:</strong> {video.fileName}
//             </div>
//             <div className="video-info">
//               <strong>File Size:</strong> {video.fileSize} bytes
//             </div>
//             <div className="video-info">
//               <strong>File Type:</strong> {video.fileExtension}
//             </div>
//             <div className="video-info">
//               <strong>Upload Date:</strong> {video.uploadTime}
//             </div>
//             <div className="video-info">
//               <strong>Upload Path:</strong> {video.uploadPath}
//             </div>
//             <div className="video-info">
//               <strong>Video Owner:</strong> {video.userName}
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default VideoList;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import TranscodeModal from './TranscodeModal';
import Notification from './Notification';

const TranscodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const RenameIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

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
      setNotification(`Failed to ${action} the video. Please try again.`);
    }
  };

  const handleDelete = async (videoId, token) => {
    // confirm before deleting
    const isConfirmed = window.confirm('Are you sure you want to delete this video?');
    if (!isConfirmed) return;
  
    try {
      // send a DELETE request to the server
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
      // handle network errors or other errors
      console.error('Error deleting video:', error);
      setNotification('An error occurred while deleting the video. Please try again later.');
    }
  };

  const handleRename = async (videoId, token) => {
    // Prompt the user for the new video name
    const newName = window.prompt('Enter the new name for the video:');
    if (!newName) return;
  
    try {
      // Send a PUT request to the server to rename the video
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
        // Show success message and refresh the video list
        setNotification(data.message || 'Video renamed successfully.');
        fetchVideos();
      } else {
        // Handle server-side errors
        setNotification(data.message || 'Failed to rename video.');
      }
    } catch (error) {
      // Handle network errors or other unexpected errors
      console.error('Error renaming video:', error);
      setNotification('An error occurred while renaming the video. Please try again later.');
    }
  };

  const handleDownload = async (fileName, token) => {
    try {
      console.log('fileName:', fileName);
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

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName.split('/').pop(); // Extract the file name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <Header showUploadButton={true} handleLogout={handleLogout} />
        {/*transcode modal*/}
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
      {/*notification*/}
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ message: '', type: '' })}
        />
      )}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>Videos uploaded by {username}</h1>
          
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Name</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Size</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Type</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Upload Date</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0' }}>
                      <a href={`/videoactions/${video.fileName}`} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>
                        {video.fileName}
                      </a>
                    </td>
                    <td style={{ padding: '0.75rem 0' }}>{video.fileSize} bytes</td>
                    <td style={{ padding: '0.75rem 0' }}>{video.fileExtension}</td>
                    <td style={{ padding: '0.75rem 0' }}>{new Date(video.uploadTime).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleAction('transcode', video.id)} 
                          style={{ padding: '0.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                          aria-label="Transcode video"
                        >
                          <TranscodeIcon />
                        </button>
                        <button 
                          onClick={() => handleAction('download', video.fileName)} 
                          style={{ padding: '0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                          aria-label="Download video"
                        >
                          <DownloadIcon />
                        </button>
                        <button 
                          onClick={() => handleAction('rename', video.id)} 
                          style={{ padding: '0.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                          aria-label="Rename video"
                        >
                          <RenameIcon />
                        </button>
                        <button 
                          onClick={() => handleAction('delete', video.id)} 
                          style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
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