import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/videoActions.css';

const VideoActions = () => {
    const { id } = useParams();
    const [showTranscodeModal, setShowTranscodeModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [progress, setProgress] = useState(0);
    const [newName, setNewName] = useState('');
    const [format, setFormat] = useState('mp4');
    const [resolution, setResolution] = useState('1280x720');
    const apiUrl = process.env.REACT_APP_API_URL;

    const getTokenFromCookies = () => {
        return document.cookie.split('; ').find(row => row.startsWith('token=')).split('=')[1];
    };

    const transcodeVideo = () => {
        console.log(`Transcoding video with ID: ${id} to ${format} at ${resolution}`);
        const token = getTokenFromCookies();

        const evtSource = new EventSource(`${apiUrl}/progress/${id}`);
        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setProgress(data.progress);
            if (data.progress === 100) {
                evtSource.close();
                alert('Transcoding complete!');
                setShowTranscodeModal(false);
            }
        };

        fetch(`${apiUrl}/transcode/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ format, resolution }),
        })
        .then(response => response.json())
        .catch(error => console.error('Error:', error));
    };

    const renameVideo = () => {
        console.log(`Renaming video with ID: ${id} to ${newName}`);
        const token = getTokenFromCookies();

        fetch(`${apiUrl}/rename/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ newName }),
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.message !== 'Please contact the administrator') {
                setShowRenameModal(false);
            }
        })
        .catch(error => console.error('Error:', error));
    };

    const deleteVideo = () => {
        console.log(`Deleting video with ID: ${id}`);
        const token = getTokenFromCookies();

        fetch(`${apiUrl}/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.message !== 'Please contact the administrator') {
                setShowDeleteModal(false);
            }
        })
        .catch(error => console.error('Error:', error));
    };

    const downloadVideo = async () => {
        try {
            console.log(`Downloading video with ID: ${id}`);
            // Assuming 'id' is the key. Adjust this if your key is different.
            const key = id;

            const data = await fetch(`${apiUrl}/generate-download-url?key=${encodeURIComponent(key)}`, {
                method: 'GET',
            });

            if (data.url) {
                // Redirect the browser to the signed URL to initiate download
                window.location.href = data.url;
            } else {
                throw new Error('Download URL not found in response.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="main-container">
            <h1>Video Actions for #ID: <span>{id}</span></h1>

            <div className="button-container">
                <button className="action-button" onClick={() => setShowTranscodeModal(true)}>Transcode Video</button>
                <button className="action-button" onClick={downloadVideo}>Download Video</button>
                <button className="action-button" onClick={() => setShowRenameModal(true)}>Rename Video</button>
                <button className="action-button" onClick={() => setShowDeleteModal(true)}>Delete Video</button>
            </div>

            {/* Transcode Modal */}
            {showTranscodeModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Transcode Video</h2>
                        <label htmlFor="format">Format:</label>
                        <select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                            <option value="mp4">MP4</option>
                            <option value="avi">AVI</option>
                        </select>
                        <label htmlFor="resolution">Resolution:</label>
                        <select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                            <option value="1280x720">1280x720 (HD)</option>
                            <option value="1920x1080">1920x1080 (HD)</option>
                            <option value="2040x1080">2040x1080 (2K)</option>
                            <option value="3840x2160">3840x2160 (4K)</option>
                        </select>
                        <div className="progress">
                            <div className="progress-bar" style={{ width: `${progress}%` }}>{progress}%</div>
                        </div>
                        <button className="modal-button" onClick={transcodeVideo}>Start Transcoding</button>
                        <button className="modal-button cancel-button" onClick={() => setShowTranscodeModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {showRenameModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Rename Video</h2>
                        <label htmlFor="newName">New Name:</label>
                        <input
                            type="text"
                            id="newName"
                            placeholder="Enter new name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button className="modal-button" onClick={renameVideo}>Rename Video</button>
                        <button className="modal-button cancel-button" onClick={() => setShowRenameModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Delete Video</h2>
                        <p>Are you sure you want to delete this video?</p>
                        <button className="modal-button" onClick={deleteVideo}>Yes, Delete</button>
                        <button className="modal-button cancel-button" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoActions;
