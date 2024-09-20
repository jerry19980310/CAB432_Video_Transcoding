const express = require("express");
const router = express.Router();
const auth = require("../auth.js");
const path = require("path");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const EventEmitter = require('events');
const ffmpegEmitter = new EventEmitter();
const fs = require('fs');
const { searchYouTube } = require("../functions/googleAPI.js");
const CP = require("node:child_process");
ffmpeg.setFfmpegPath(ffmpegPath);

// A plain GET will give the login page
// router.get("/login", (req, res) => {
//    res.sendFile(path.join(__dirname, "../public/login.html"));
// });

// router.get("/videolist", (req, res) => {
//    res.sendFile(path.join(__dirname, "../public/videolist.html"));
// });

// POST for getting the cookie
router.post("/login", (req, res) => {
   console.log("Login attempt for user:", req.body.username);
   const { username, password } = req.body;
   const token = auth.generateAccessToken(username, password);

   if (!token) {
      console.log("Login failed for user:", username);
      return res.status(403).json({ success: false, message: "Invalid credentials" });
   }

   console.log("Login successful for user:", username);
   res.json({
    success: true,
    token: token,
    username: username
   });
});

// Log out by deleting token cookie.  Redirect back to login.
router.get("/logout", auth.authenticateCookie, (req, res) => {
   console.log("Logout by user", req.user.username);
   res.clearCookie("token");
   res.redirect("/login");
});


//fetching videos
router.get('/videos', auth.authenticateCookie, (req, res) => {
    console.log("Fetching videos for user:", req.user.username);
 
    // Check if the user is an admin
    if (req.user.admin) {
        console.log("1");
        // Admin user: fetch all videos
        req.db.all("SELECT * FROM videos", (err, rows) => {
            if (err) {
                console.log("Error fetching videos for admin:", err.message);
                console.log("2");
                return res.status(500).send("Error fetching videos from database: " + err.message);
            }
 
            const videos = rows.map(row => ({
                id: row.id,
                fileName: row.fileName,
                uploadPath: row.uploadPath,
                shortFileName: row.shortFileName,
                fileExtension: row.fileExtension,
                fileSize: row.fileSize,
                uploadTime: row.uploadTime,
                userName: row.userName
            }));
 
            // Return the videos as a JSON response
            console.log("3");
            return res.json(videos); // Ensure a return to avoid continuing the execution
        });
    } else {
        // Non-admin user: fetch videos for the specified username
        req.db.all("SELECT * FROM videos WHERE userName=?", [req.user.username], (err, rows) => {
            console.log("4");
            if (err) {
                console.log("Error fetching videos for user:", err.message);
                console.log("5");
                return res.status(500).send("Error fetching videos from database: " + err.message);
            }
            console.log("6");
            console.log(rows);
 
            const videos = rows.map(row => ({
                id: row.id,
                fileName: row.fileName,
                uploadPath: row.uploadPath,
                shortFileName: row.shortFileName,
                fileExtension: row.fileExtension,
                fileSize: row.fileSize,
                uploadTime: row.uploadTime,
                userName: row.userName
            }));
            console.log("7");
            console.log(videos);
 
            // Return the videos as a JSON response
            return res.json(videos); // Ensure a return here as well
        });
    }
 });
// router.get('/videos', auth.authenticateCookie, (req, res) => {
//    console.log("Fetching videos for user:", req.user.username);
//    const query = req.user.admin ? "SELECT * FROM videos" : "SELECT * FROM videos WHERE userName=?";
//    const params = req.user.admin ? [] : [req.user.username];

//    req.db.all(query, params, (err, rows) => {
//        if (err) {
//            console.error("Error fetching videos from database:", err.message);
//            return res.status(500).send("Error fetching videos from database: " + err.message);
//        }

//        const videos = rows.map(row => ({
//            id: row.id,
//            fileName: row.fileName,
//            uploadPath: row.uploadPath,
//            shortFileName: row.shortFileName,
//            fileExtension: row.fileExtension,
//            fileSize: row.fileSize,
//            uploadTime: row.uploadTime,
//            userName: row.userName
//        }));

//        res.json(videos);
//    });
// });

router.get('/progress/:id', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
 
    const videoId = req.params.id;
    const sendProgress = (progress) => {
        res.write(`data: ${JSON.stringify({ progress })}\n\n`);
    };
 
    // Set up a listener for progress updates
    const listener = progress => sendProgress(progress);
    ffmpegEmitter.on(videoId, listener);
 
    // Remove listener when client closes connection
    req.on('close', () => {
        ffmpegEmitter.removeListener(videoId, listener);
        res.end();
    });
 });

 // Route to download video
router.get('/download/:id', auth.authenticateCookie, (req, res) => {
    const id = req.params.id;
    req.db.get(`SELECT uploadPath FROM videos WHERE id=?`, [id], (err, row) => {
        if (err) {
            res.status(500).send(err.message);
        } else if (row) {
            res.download(row.uploadPath);
        } else {
            res.status(404).send('File not found');
        }
    });
 });
 
 // Test route to simulate loading
 router.get('/test', (req, res) => {
     setTimeout(() => {
         res.send('Test server is working.');
     }, 500); // Simulates a 0.5-second delay
 });

router.post("/upload", auth.authenticateCookie, async (req, res) => {
    const file = req.files.uploadFile;
    const fullFileName = file.name;
    const fileExtension = fullFileName.split('.').pop();
    const fileNameWithoutExtension = fullFileName.replace(/\.[^/.]+$/, "");
    const fileSize = file.size;
    const uploadPath = path.join(__dirname, "../uploads", fullFileName);
 
    try {
        await file.mv(uploadPath);

        // Analyze video metadata
        ffmpeg.ffprobe(uploadPath, async (err, metadata) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Failed to extract video metadata: " + err.message);
            }

            const duration = metadata.format.duration;
            const bitrate = metadata.format.bit_rate;
            const resolution = metadata.streams[0].width + 'x' + metadata.streams[0].height;

            req.db.run("INSERT INTO videos(fileName, fileExtension, fileSize, uploadPath, userName, shortFileName, duration, bitrate, resolution) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [fullFileName, fileExtension, fileSize, uploadPath, req.user.username, fileNameWithoutExtension, duration, bitrate, resolution], async function (dbErr) {
                    if (dbErr) {
                        return res.status(500).send("Failed to insert video data into database: " + dbErr.message);
                    }

                    const newUploadPath = path.join(__dirname, "../uploads", `${this.lastID}.${fileExtension}`);

                    fs.rename(uploadPath, newUploadPath, async (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send(err.message);
                        }

                        req.db.run("UPDATE videos SET uploadPath = ? WHERE id = ?", [newUploadPath, this.lastID], async (updateErr) => {
                            if (updateErr) {
                                return res.status(500).send("Failed to update video data in database: " + updateErr.message);
                            }

                            try {
                                const relatedVideos = await searchYouTube(fileNameWithoutExtension, 10);
                                res.json({
                                    message: 'Upload successful',
                                    fileName: fullFileName,
                                    relatedVideos: relatedVideos,
                                });
                            } catch (error) {
                                console.error(error);
                                res.status(500).json({ message: 'Upload successful, but failed to fetch related videos', error: error.message });
                            }
                        });
                    });
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

router.post('/transcode/:id', auth.authenticateCookie, (req, res) => {
    const videoId = req.params.id;
    const targetFormat = req.body.format || 'mp4';
    const resolution = req.body.resolution || '1280x720';

    req.db.get("SELECT * FROM videos WHERE id=?", [videoId], (err, row) => {
        if (err) {
            console.error("Database query error: " + err.message);
            return res.status(500).send("Database query error: " + err.message);
        }
        if (!row) {
            return res.status(404).send("Video not found");
        }

        const sourcePath = row.uploadPath;
        const outputPath = sourcePath.replace(/\.[^/.]+$/, `.${targetFormat}`);
        const fileName = row.shortFileName;

        ffmpeg(sourcePath)
            .output(outputPath)
            .size(resolution)
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('progress', (progress) => {
                // Emit progress update
                ffmpegEmitter.emit(videoId, Math.floor(progress.percent));
                console.log(`Progress: ${progress.percent}%`);
            })
            .on('end', () => {
               console.log('Transcoding succeeded.');
               fs.stat(outputPath, (fsErr, stats) => {
                  if (fsErr) {
                      console.error("File system error: " + fsErr.message);
                      return res.status(500).send("File system error: " + fsErr.message);
                  }

                  const fileSize = stats.size; // size in bytes
                  req.db.run("UPDATE videos SET fileName = ?, uploadPath = ?, fileExtension = ?, resolution = ?, fileSize = ? WHERE id = ?", [fileName+'.'+targetFormat, outputPath, targetFormat, resolution, fileSize, videoId], (updateErr) => {
                      if (updateErr) {
                          console.error("Failed to update video data in database: " + updateErr.message);
                          return res.status(500).send("Failed to update video data in database: " + updateErr.message);
                      }
                      ffmpegEmitter.emit(videoId, 100); // Ensure 100% progress is sent
                      res.send({ message: 'Transcoding succeeded', file: outputPath, size: fileSize });
                  });
              });
            })
            .on('error', (transcodeErr) => {
                console.error('Transcoding failed: ' + transcodeErr.message);
                res.status(500).send('Transcoding failed: ' + transcodeErr.message);
            })
            .run();
    });
});

// Route to delete a video
router.delete('/delete/:id', auth.authenticateCookie, (req, res) => {
   const videoId = req.params.id;
   const isAdmin = req.user.admin;

   if (!isAdmin) {
      return res.send({ message: 'Please contact the administrator' }); // Forbidden if not an admin
   }

   req.db.get("SELECT uploadPath FROM videos WHERE id=?", [videoId], (err, row) => {
       if (err) {
           return res.status(500).send("Database error: " + err.message);
       }
       if (!row) {
           return res.status(404).send("Video not found");
       }

       const filePath = row.uploadPath;
       fs.unlink(filePath, (unlinkErr) => {
           if (unlinkErr) {
               return res.status(500).send("Failed to delete file: " + unlinkErr.message);
           }

           req.db.run("DELETE FROM videos WHERE id=?", [videoId], (dbErr) => {
               if (dbErr) {
                   return res.status(500).send("Failed to delete video record: " + dbErr.message);
               }
               res.send({ message: 'Video deleted successfully' });
           });
       });
   });
});

// Route to rename a video
router.put('/rename/:id', auth.authenticateCookie, (req, res) => {
   const videoId = req.params.id;
   const newName = req.body.newName;
   const isAdmin = req.user.admin;

   if (!isAdmin) {
      return res.send({ message: 'Please contact the administrator' }); // Forbidden if not an admin
   }
   
   req.db.run("UPDATE videos SET shortFileName = ? WHERE id = ?", [newName, videoId], (updateErr) => {
      if (updateErr) {
            return res.status(500).send("Failed to update video data in database: " + updateErr.message);
      }
      res.send({ message: 'Video renamed successfully' });
   });
});


// Serve up static files if they exist in public directory, protected by authentication middleware
router.use("/", auth.authenticateCookie, express.static(path.join(__dirname, "../public")));

module.exports = router;
