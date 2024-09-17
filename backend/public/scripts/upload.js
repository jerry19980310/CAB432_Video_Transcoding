// document.getElementById('uploadForm').addEventListener('submit', function (event) {
//     event.preventDefault();
//     const formData = new FormData(this);

//     fetch('/upload', {
//         method: 'POST',
//         body: formData,
//     })
//         .then(response => response.json())
//         .then(data => {
//             if (data.message && data.fileName) {
//                 const uploadMessage = document.getElementById('uploadMessage');
//                 uploadMessage.textContent = `${data.fileName} uploaded successfully!`;
//             }

//             if (data.relatedVideos) {
//                 const videoList = document.getElementById('videoList');
//                 videoList.innerHTML = '';
//                 data.relatedVideos.forEach(video => {
//                     const videoItem = document.createElement('li');
//                     videoItem.innerHTML = `
//                         <iframe width="560" height="315"
//                             src="https://www.youtube.com/embed/${video.videoId}"
//                             frameborder="0"
//                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                             allowfullscreen>
//                         </iframe>
//                         <p>${video.title}</p>`;
//                     videoList.appendChild(videoItem);
//                 });
//             }
//         })
//         .catch(error => console.error('Error:', error));
// });
