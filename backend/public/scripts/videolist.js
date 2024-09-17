// import React, { useEffect, useState } from 'react';
// import { useHistory } from 'react-router-dom';

// const VideoList = () => {
//   const [videos, setVideos] = useState([]);
//   const [username, setUsername] = useState('');
//   const history = useHistory();

//   useEffect(() => {
//     // Move fetchVideos function inside useEffect
//     const fetchVideos = () => {
//       const getTokenFromCookies = () => {
//         const cookieValue = document.cookie
//           .split('; ')
//           .find(row => row.startsWith('token='))
//           ?.split('=')[1];
//         return cookieValue || '';
//       };

//       const getUserFromCookies = () => {
//         const cookieValue = document.cookie
//           .split('; ')
//           .find(row => row.startsWith('username='))
//           ?.split('=')[1];
//         return cookieValue || '';
//       };

//       const username = getUserFromCookies();
//       setUsername(username); // Update username in state
//       const token = getTokenFromCookies();

//       fetch(`/videos/${username}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       })
//         .then(response => {
//           if (!response.ok) {
//             throw new Error('Network response was not ok');
//           }
//           return response.json();
//         })
//         .then(data => {
//           setVideos(data); // Update videos in state
//         })
//         .catch(error => {
//           console.error('There was a problem with the fetch operation:', error);
//         });
//     };

//     fetchVideos(); // Call the function
//   }, []); // Empty dependency array ensures this runs once on mount

//   const handleBackToMainPage = () => {
//     history.push('/'); // Redirect to main page
//   };

//   return (
//     <div className="video-list-container">
//       <h2>Videos uploaded by {username}</h2>
//       <ul id="videoList">
//         {videos.map(video => (
//           <li key={video.id}>
//             <div className="video-info">
//               <a
//                 href={`/videoDetails.html?id=${video.id}`}
//                 target="_blank"
//                 rel="noopener noreferrer"  // Fixing the security risk issue
//               >
//                 <strong>File ID:</strong> {video.id}
//               </a>
//             </div>
//             <div className="video-info">
//               <strong>File Name:</strong> {video.shortFileName}
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
//       <button onClick={handleBackToMainPage} className="back-button">Back to Main Page</button>
//     </div>
//   );
// };

// export default VideoList;
