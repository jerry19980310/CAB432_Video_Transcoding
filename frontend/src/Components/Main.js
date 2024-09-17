import React, { useState } from 'react';
import axios from 'axios';

const Main = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [videos, setVideos] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('uploadFile', file);

    try {
      const response = await axios.post('/upload', formData);
      if (response.status === 200) {
        setMessage('Upload successful!');
        setVideos(response.data.relatedVideos);
      }
    } catch (error) {
      setMessage('Upload failed!');
    }
  };

  return (
    <div className="main-container">
      <h1>Video Transcode Factory</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <h2>{message}</h2>
      <ul>
        {videos.map((video, index) => (
          <li key={index}>
            <iframe 
              width="560" 
              height="315"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title={video.title}
            />
            <p>{video.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Main;
