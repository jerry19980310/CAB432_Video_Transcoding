import React from 'react';

const UploadSuccess = ({ relatedVideos }) => {
    return (
        <div className="upload-success-container">
            <h1>File Uploaded Successfully</h1>
            <p>Check the related YouTube videos below:</p>
            <div id="videoContainer">
                {relatedVideos && relatedVideos.length > 0 ? (
                    relatedVideos.map((video, index) => (
                        <div key={index}>
                            <h3>{video.title}</h3>
                            <iframe
                                width="560"
                                height="315"
                                src={`https://www.youtube.com/embed/${video.videoId}`}
                                frameBorder="0"
                                allowFullScreen
                                title={`${video.title} - Video ${index + 1}`}
                            ></iframe>
                            <p>{video.description}</p>
                        </div>
                    ))
                ) : (
                    <p>No related videos available.</p>
                )}
            </div>
        </div>
    );
};

export default UploadSuccess;
