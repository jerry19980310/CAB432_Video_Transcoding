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
const { s3Client } = require('../public/config.js');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fetch = require('node-fetch');
const { InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const cognitoClient = require("../public/cognito"); // Path to your AWS config


const CLIENT_ID = process.env.COGNITO_CLIENT_ID; 
const JWT_SECRET = process.env.JWT_SECRET ; 


ffmpeg.setFfmpegPath(ffmpegPath);



router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // 驗證輸入欄位
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH", // 使用者名稱與密碼認證流程
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    // 檢查是否成功
    console.log("Cognito response:", response);
    if (response.AuthenticationResult) {
      const { IdToken, AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      // 如果您希望使用 Cognito 的 ID Token 作為回應的一部分
      return res.json({
        success: true,
        message: "Login successful.",
        data: {
          idToken: IdToken,
          accessToken: AccessToken,
          refreshToken: RefreshToken,
          expiresIn: ExpiresIn,
          username: username,
        },
      });

    } else {
      // 未預期的回應
      return res.status(500).json({
        success: false,
        message: "Login failed. Please try again later.",
      });
    }
  } catch (error) {
    // 處理特定的 Cognito 錯誤
    if (error.name === "NotAuthorizedException") {
      return res.status(403).json({ success: false, message: "Invalid credentials" });
    } else if (error.name === "UserNotFoundException") {
      return res.status(403).json({ success: false, message: "User does not exist" });
    } else if (error.name === "UserNotConfirmedException") {
      return res.status(403).json({ success: false, message: "User is not confirmed. Please verify your email." });
    } else {
      // 通用錯誤處理
      console.error("Cognito Login Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred during login. Please try again later。",
      });
    }
  }
});

// Log out by deleting token cookie.  Redirect back to login.
router.get("/logout", auth.authenticateCookie, (req, res) => {
   console.log("Logout by user", req.user.username);
   res.clearCookie("token");
   res.redirect("/login");
});

/*
//fetching videos
router.get('/videos', auth.authenticateCookie, (req, res) => {
    console.log("Fetching videos for user:", req.user);
  // console.log(req);
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
        req.db.all("SELECT * FROM videos WHERE userName=?", [req.user], (err, rows) => {
            console.log("4");
            console.log(req.user);
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
*/
 router.get('/videos', auth.authenticateCookie, async (req, res) => {
  console.log("Fetching videos for user:", req.user);
  try {
      let rows;
      // if (req.user.admin) {
      //     // Admin user: fetch all videos
      //     const [results] = await req.db.query("SELECT * FROM videos");
      //     rows = results;
      // } else {
      //     // Non-admin user: fetch videos for the specified username
      //     const [results] = await req.db.query("SELECT * FROM videos WHERE userName = ?", [req.user.username]);
      //     rows = results;
      // }

      // Non-admin user: fetch videos for the specified username
      const [results] = await req.db.query("SELECT * FROM videos WHERE userName = ?", [req.user]);
      console.log(results);
      rows = results;
    

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

      return res.json(videos);
  } catch (err) {
      console.error("Error fetching videos:", err.message);
      return res.status(500).send("Error fetching videos from database: " + err.message);
  }
});

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


// router.post("/upload", auth.authenticateCookie, async (req, res) => {
//     const file = req.files.uploadFile;
//     const fullFileName = file.name;
//     const fileExtension = fullFileName.split('.').pop();
//     const fileNameWithoutExtension = fullFileName.replace(/\.[^/.]+$/, "");
//     const fileSize = file.size;

//     // name the file with a unique name
//     const uniqueFileName = `${Date.now()}-${fullFileName}`;
//     const tempFilePath = path.join(__dirname, "../temp", uniqueFileName);

//     try {
//         if (!fs.existsSync(path.join(__dirname, "../temp"))) {
//             fs.mkdirSync(path.join(__dirname, "../temp"));
//         }

//         // temporarily save the file
//         await file.mv(tempFilePath);

//         // Analyze video metadata
//         ffmpeg.ffprobe(tempFilePath, async (err, metadata) => {
//             if (err) {
//                 console.error(err);
//                 fs.unlinkSync(tempFilePath); // delete the temporary file
//                 return res.status(500).send("Failed to extract video metadata: " + err.message);
//             }

//             const duration = metadata.format.duration;
//             const bitrate = metadata.format.bit_rate;
//             const resolution = metadata.streams[0].width + 'x' + metadata.streams[0].height;

//             // Upload the file to S3
//             const fileContent = fs.readFileSync(tempFilePath);

//             const params = {
//                 Bucket: 'n11428911-assessment2',
//                 Key: `uploads/${uniqueFileName}`,
//                 Body: fileContent,
//                 ContentType: file.mimetype,
//             };

//             try {
//                 const data = await s3Client.send(new PutObjectCommand(params));
                
//                 // delete the temporary file
//                 fs.unlinkSync(tempFilePath);

//                 // Insert video data into database
//                 req.db.run(
//                     "INSERT INTO videos(fileName, fileExtension, fileSize, uploadPath, userName, shortFileName, duration, bitrate, resolution) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",
//                     [
//                         uniqueFileName,
//                         fileExtension,
//                         fileSize,
//                         `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`, // S3 URL
//                         req.user.username,
//                         fileNameWithoutExtension,
//                         duration,
//                         bitrate,
//                         resolution,
//                     ],
//                     async function (dbErr) {
//                         if (dbErr) {
//                             return res.status(500).send("Failed to insert video data into database: " + dbErr.message);
//                         }

//                         try {
//                             const relatedVideos = await searchYouTube(fileNameWithoutExtension, 10);
//                             res.json({
//                                 message: 'Upload successful',
//                                 fileName: fullFileName,
//                                 s3Url: `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`,
//                                 relatedVideos: relatedVideos,
//                             });
//                         } catch (error) {
//                             res.status(500).send(error.message);
//                             console.error(error);
//                         }
//                     }
//                 );
//             } catch (s3Err) {
//                 console.error(s3Err);
//                 return res.status(500).send("Failed to upload file to S3: " + s3Err.message);
//             }
//         });
//     } catch (uploadError) {
//         console.error(uploadError);
//         res.status(500).send("Failed to upload video: " + uploadError.message);
//     }
// });


router.get('/api', (req, res) => {
    res.json({ message: 'Hello from backend' });
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



// generate-upload-url route
router.get('/generate-upload-url', auth.authenticateCookie, async (req, res) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType query parameters' });
  }

  const uniqueFileName = `${Date.now()}-${fileName}`;
  const bucketName = process.env.AWS_BUCKET_NAME;
  const key = `uploads/${uniqueFileName}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // set the URL to expire in 60 seconds
    res.json({ url: uploadUrl, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating signed URL' });
  }
});

// generate-download-url route
router.get('/generate-download-url', auth.authenticateCookie, async (req, res) => {
  const { key } = req.query;
  console.log(req);

  if (!key) {
    return res.status(400).json({ error: 'Missing key query parameter' });
  }

  const bucketName = process.env.AWS_BUCKET_NAME;

  const params = {
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`, // force download
  };

  const command = new GetObjectCommand(params);

  try {
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // 有效期为60秒
    console.log(downloadUrl);
    res.json({ url: downloadUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating signed URL' });
  }
});

// Route to delete a video
router.post('/upload-complete', auth.authenticateCookie, async (req, res) => {
  const { key, userName } = req.body;

  if (!key || !userName) {
      return res.status(400).json({ error: 'Missing key or userName parameters' });
  }

  const bucketName = process.env.AWS_BUCKET_NAME;
  const uploadPath = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  try {
      // 確保 temp 目錄存在
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
      }

      // 下載文件以分析元數據
      const tempFilePath = path.join(tempDir, path.basename(key));

      const getObjectParams = {
          Bucket: bucketName,
          Key: key,
      };

      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

      const response = await fetch(url);

      if (!response.ok) {
          throw new Error(`Failed to fetch the file: ${response.statusText}`);
      }

      // 將響應主體轉換為緩衝區
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 將緩衝區寫入臨時文件
      fs.writeFileSync(tempFilePath, buffer);

      // 分析視頻元數據
      const metadata = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(tempFilePath, (err, data) => {
              if (err) return reject(err);
              resolve(data);
          });
      });

      const duration = metadata.format.duration;
      const bitrate = metadata.format.bit_rate;
      const resolution = `${metadata.streams[0].width}x${metadata.streams[0].height}`;
      const fileSize = metadata.format.size;
      const fileExtension = key.split('.').pop();
      const fileNameWithoutExtension = key.replace(/\.[^/.]+$/, "");

      // 刪除臨時文件
      fs.unlinkSync(tempFilePath);

      // 插入視頻數據到資料庫
      const insertQuery = `
          INSERT INTO videos (fileName, fileExtension, fileSize, uploadPath, userName, shortFileName, duration, bitrate, resolution)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await req.db.execute(insertQuery, [
          path.basename(key),
          fileExtension,
          fileSize,
          uploadPath,
          userName,
          fileNameWithoutExtension,
          duration,
          bitrate,
          resolution,
      ]);

      // 獲取相關視頻
      const relatedVideos = await searchYouTube(fileNameWithoutExtension, 10);

      // 返回成功響應
      return res.json({
          message: 'Upload and processing successful',
          fileName: path.basename(key),
          s3Url: uploadPath,
          relatedVideos: relatedVideos,
      });
  } catch (error) {
      console.error("Error processing uploaded file:", error);
      return res.status(500).send("Error processing uploaded file: " + error.message);
  }
});

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
