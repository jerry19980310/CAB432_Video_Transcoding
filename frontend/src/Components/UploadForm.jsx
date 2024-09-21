import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'lite-youtube-embed/src/lite-yt-embed.css';
import 'lite-youtube-embed';


if (typeof window !== 'undefined') {
    import('lite-youtube-embed');
}

const iconStyle = {
  marginRight: '8px',
  width: '16px',
  height: '16px',
};

const VideoIcon = () => (
  <svg style={{ width: '32px', height: '32px', color: '#4f46e5' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const LogoutIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const FilmIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const UploadIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

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

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
    
        if (!file) {
          setUploadMessage('Please select a file to upload.');
          return;
        }
    
        try {
          setUploadMessage('Requesting upload URL...');
    
          // 1. 请求服务器生成预签名上传 URL
          const response = await fetch(`${apiUrl}/generate-upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`, {
            method: 'GET',
            credentials: 'include',
          });
    
          if (!response.ok) {
            throw new Error(`Failed to get upload URL: ${response.statusText}`);
          }
    
          const { url: uploadUrl, key } = await response.json();
    
          if (!uploadUrl || !key) {
            throw new Error('Invalid upload URL or key received from server.');
          }
    
          setUploadMessage('Uploading to S3...');
    
          // 2. 使用预签名 URL 上传文件到 S3
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
    
          // 3. 通知服务器上传完成
          const notifyResponse = await fetch(`${apiUrl}/upload-complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              key: key, // S3 对象键
              userName: 'currentUser', // 根据您的身份验证逻辑获取当前用户名
            }),
          });
    
          if (!notifyResponse.ok) {
            throw new Error(`Failed to notify server: ${notifyResponse.statusText}`);
          }
    
          const notifyData = await notifyResponse.json();
    
          if (notifyData.message && notifyData.fileName) {
            setUploadMessage(`${notifyData.fileName} uploaded successfully!`);
            setVideos(prevVideos => [...prevVideos, {
              id: prevVideos.length + 1,
              fileName: notifyData.fileName,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
              uploadTime: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            }]);
          }
    
          if (notifyData.relatedVideos) {
            setRelatedVideos(notifyData.relatedVideos);
          }
        } catch (error) {
          console.error('Error:', error);
          setUploadMessage(`Error: ${error.message}`);
        }
      }, [file]);

    const handleLogout = useCallback(() => {
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/login');
    }, [navigate]);

    const handleViewVideo = useCallback((fileName) => {
        console.log(`View video: ${fileName}`);
        // Implement view functionality here
    }, []);


    return (
        <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#f3f4f6', padding: '2rem' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', padding: '1rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <VideoIcon />
                            <span style={{ marginLeft: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Jerry Video Transcode</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '1rem' }} onClick={() => navigate('/videolist')}>
                                <FilmIcon />
                                My Videos
                            </button>
                            <button style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '1rem' }} onClick={handleLogout}>
                                <LogoutIcon />
                                Logout
                            </button>
                        </div>
                    </div>
                </nav>

                <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>Upload Your Video</h1>
                    
                    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', marginBottom: '2rem' }}>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    style={{ flexGrow: 1, minWidth: '200px' }}
                                />
                                <button type="submit" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                                    <UploadIcon />
                                    Upload
                                </button>
                            </div>
                        </form>
                        {uploadMessage && (
                            <p style={{ marginTop: '1rem', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>{uploadMessage}</p>
                        )}
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflowX: 'auto', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>My Videos</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Name</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>File Size</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Upload Time</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {videos.map((video) => (
                                    <tr key={video.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '0.75rem 0' }}>{video.fileName}</td>
                                        <td style={{ padding: '0.75rem 0' }}>{video.fileSize}</td>
                                        <td style={{ padding: '0.75rem 0' }}>{video.uploadTime}</td>
                                        <td style={{ padding: '0.75rem 0' }}>
                                            <button 
                                                onClick={() => handleViewVideo(video.fileName)}
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

                    {relatedVideos.length > 0 && (
                        <div style={{ width: '100%', marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>Related YouTube Videos</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                {relatedVideos.map(video => (
                                    <div key={video.videoId} style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                                        <lite-youtube 
                                            videoid={video.videoId}
                                            style={{ backgroundColor: '#000', position: 'relative', display: 'block', contain: 'content', backgroundPosition: 'center center', backgroundSize: 'cover', cursor: 'pointer', width: '100%', aspectRatio: '16 / 9' }}
                                        ></lite-youtube>
                                        <div style={{ padding: '1rem' }}>
                                            <p style={{ color: '#1f2937', fontWeight: '600' }}>{video.title}</p>
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