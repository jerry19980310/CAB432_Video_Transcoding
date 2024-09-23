// TranscodeModal.js
import React, { useState, useEffect } from 'react';

function TranscodeModal({ videoId, onClose, onTranscodeComplete, token, apiUrl }) {
  const [transcodeOptions, setTranscodeOptions] = useState({
    format: 'mp4',
    resolution: '1280x720',
  });
  const [transcodeProgress, setTranscodeProgress] = useState(null);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    let eventSource;

    if (isTranscoding) {
      eventSource = new EventSource(`${apiUrl}/progress/${videoId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setTranscodeProgress(data.progress);
        if (data.progress >= 100) {
          eventSource.close();
          setNotification('Transcoding completed successfully.');
          setTimeout(() => {
            setNotification('');
            onTranscodeComplete();
          }, 3000);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        eventSource.close();
        setIsTranscoding(false);
        setNotification('An error occurred during transcoding.');
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isTranscoding, videoId, apiUrl, onTranscodeComplete]);

  const handleStartTranscoding = async () => {
    try {
      setIsTranscoding(true);
      setTranscodeProgress(0);

      const response = await fetch(`${apiUrl}/transcode/${videoId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(transcodeOptions),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to transcode video.');
      }

      // The progress will be handled by EventSource
    } catch (error) {
      console.error('Error during transcoding:', error);
      setIsTranscoding(false);
      setNotification(error.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // Ensure the modal is on top
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          width: '400px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Transcode Video</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
            Format:
          </label>
          <select
            value={transcodeOptions.format}
            onChange={(e) =>
              setTranscodeOptions({ ...transcodeOptions, format: e.target.value })
            }
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #d1d5db',
            }}
          >
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mkv">MKV</option>
            <option value="mov">MOV</option>
            <option value="wmv">WMV</option>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
            Resolution:
          </label>
          <select
            value={transcodeOptions.resolution}
            onChange={(e) =>
              setTranscodeOptions({ ...transcodeOptions, resolution: e.target.value })
            }
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #d1d5db',
            }}
          >
            <option value="640x360">640x360 (SD)</option>
            <option value="1280x720">1280x720 (HD)</option>
            <option value="1920x1080">1920x1080 (Full HD)</option>
            <option value="3840x2160">3840x2160 (4K)</option>
          </select>
        </div>

        {isTranscoding && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                width: '100%',
                backgroundColor: '#e5e7eb',
                borderRadius: '0.25rem',
              }}
            >
              <div
                style={{
                  width: `${transcodeProgress}%`,
                  backgroundColor: '#4f46e5',
                  height: '1rem',
                  borderRadius: '0.25rem',
                  transition: 'width 0.5s ease',
                }}
              ></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#4f46e5' }}>
              {transcodeProgress}%
            </p>
          </div>
        )}

        {notification && (
          <div
            style={{
              backgroundColor: '#d1fae5',
              padding: '0.75rem',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#065f46', margin: 0 }}>{notification}</p>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1rem',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={onClose}
            disabled={isTranscoding}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStartTranscoding}
            disabled={isTranscoding}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            {isTranscoding ? 'Transcoding...' : 'Start Transcoding'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranscodeModal;
