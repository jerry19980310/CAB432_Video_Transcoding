// const videoId = new URLSearchParams(window.location.search).get('id');

// function showTranscodeModal() {
//     document.getElementById('transcodeModal').style.display = 'block';
// }

// function transcodeVideo() {
//     const format = document.getElementById('format').value;
//     const resolution = document.getElementById('resolution').value;
//     console.log(`Transcoding video with ID: ${videoId} to ${format} at ${resolution}`);

//     const evtSource = new EventSource(`/progress/${videoId}`);
//     evtSource.onmessage = function (event) {
//         const data = JSON.parse(event.data);
//         updateProgressBar(data.progress);
//         if (data.progress === 100) {
//             evtSource.close();
//             alert('Transcoding complete!');
//             document.getElementById('transcodeModal').style.display = 'none';
//         }
//     };

//     fetch(`/transcode/${videoId}`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${getTokenFromCookies()}`
//         },
//         body: JSON.stringify({ format, resolution })
//     }).then(response => response.json())
//         .catch(error => console.error('Error:', error));
// }

// function updateProgressBar(progress) {
//     const progressBar = document.getElementById('progressBar');
//     progressBar.style.width = progress + '%';
//     progressBar.textContent = progress + '%';
// }

// function downloadVideo() {
//     console.log(`Downloading video with ID: ${videoId}`);
//     window.location.href = `/download/${videoId}`;
// }

// function showRenameModal() {
//     document.getElementById('renameModal').style.display = 'block';
// }

// function renameVideo() {
//     const newName = document.getElementById('newName').value;
//     console.log(`Renaming video with ID: ${videoId} to ${newName}`);

//     fetch(`/rename/${videoId}`, {
//         method: 'put',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${getTokenFromCookies()}`
//         },
//         body: JSON.stringify({ newName })
//     }).then(response => response.json())
//         .then(data => {
//             if (data.message === 'Please contact the administrator') {
//                 alert('Please contact the administrator');
//             } else {
//                 alert(data.message);
//                 document.getElementById('renameModal').style.display = 'none';
//             }
//         })
//         .catch(error => console.error('Error:', error));
// }

// function cancelRename() {
//     document.getElementById('renameModal').style.display = 'none';
// }

// function deleteVideo() {
//     document.getElementById('deleteModal').style.display = 'block';
// }

// function confirmDelete() {
//     console.log(`Deleting video with ID: ${videoId}`);

//     fetch(`/delete/${videoId}`, {
//         method: 'delete',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${getTokenFromCookies()}`
//         }
//     }).then(response => response.json())
//         .then(data => {
//             if (data.message === 'Please contact the administrator') {
//                 alert('Please contact the administrator');
//             } else {
//                 alert(data.message);
//                 document.getElementById('deleteModal').style.display = 'none';
//             }
//         })
//         .catch(error => console.error('Error:', error));
// }

// function cancelDelete() {
//     document.getElementById('deleteModal').style.display = 'none';
// }

// function getTokenFromCookies() {
//     return document.cookie.split('; ').find(row => row.startsWith('token=')).split('=')[1];
// }

// document.getElementById('videoTitle').textContent = videoId;
