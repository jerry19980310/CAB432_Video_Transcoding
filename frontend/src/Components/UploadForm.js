import React, { useState } from 'react';

const UploadForm = () => {
    const [file, setFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [relatedVideos, setRelatedVideos] = useState([]);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!file) {
            setUploadMessage('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('uploadFile', file);

        fetch('/upload', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.message && data.fileName) {
                    setUploadMessage(`${data.fileName} uploaded successfully!`);
                }

                if (data.relatedVideos) {
                    setRelatedVideos(data.relatedVideos);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                setUploadMessage('Error uploading file.');
            });
    };

    return (
        <div className="main-container">
            <div className="header">
                <div className="header-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="white">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM10 17.5v-11l8.5 5.5-8.5 5.5z" />
                    </svg>
                </div>
                <h1>Jerry Video Transcode</h1>
                <a href="/logout" className="logout-button">Logout</a>
            </div>

            <form onSubmit={handleSubmit} className="upload-section">
                <input type="file" name="uploadFile" className="upload-input" onChange={handleFileChange} />
                <input type="submit" value="Upload" className="upload-button" />
                <button type="button" className="my-videos-button" onClick={() => window.location.href = '/videolist'}>My Videos</button>
            </form>

            <h2>{uploadMessage}</h2>

            <div className="scrollable-container">
                <h2>Related YouTube Videos</h2>
                <ul>
                    {relatedVideos.map(video => (
                        <li key={video.videoId}>
                            <iframe
                                width="560"
                                height="315"
                                src={`https://www.youtube.com/embed/${video.videoId}`}
                                frameBorder="0"
                                title={`YouTube video player: ${video.title}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                            <p>{video.title}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UploadForm;
