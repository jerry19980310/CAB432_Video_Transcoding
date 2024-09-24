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
const initializeS3Client = require('../public/config');
const { getAwsSecret }= require('../public/awsSecret.js');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fetch = require('node-fetch');
const { InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const initializeCognitoClient = require("../public/cognito");
const tmp = require('tmp');
const axios = require('axios');



ffmpeg.setFfmpegPath(ffmpegPath);



router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const cognitoClient = await initializeCognitoClient();

  // 驗證輸入欄位
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const awsSecret = await getAwsSecret();
  const CLIENT_ID = awsSecret.COGNITO_CLIENT_ID;

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


 router.get('/videos', auth.authenticateCookie, async (req, res) => {
  console.log("Fetching videos for user:", req.user);
  console.log("Fetching videos for group:", req.group);
  try {
      let rows;
      if (req.group == 'admin') {
          // Admin user: fetch all videos
          const [results] = await req.db.query("SELECT * FROM videos");
          rows = results;
      } else {
          // Non-admin user: fetch videos for the specified username
          const [results] = await req.db.query("SELECT * FROM videos WHERE userName = ?", [req.user]);
          rows = results;
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
 
 // Test route to simulate loading
 router.get('/test', (req, res) => {
     setTimeout(() => {
         res.send('Test server is working.');
     }, 500); // Simulates a 0.5-second delay
 });


router.get('/api', (req, res) => {
    res.json({ message: 'Hello from backend' });
  });

router.post('/transcode/:id', auth.authenticateCookie, async (req, res) => {
  const videoId = req.params.id;
  const targetFormat = req.body.format || 'mp4';
  const resolution = req.body.resolution || '1280x720';
  const secret = await getAwsSecret();

  try {
      // 從數據庫獲取視頻信息
      const [rows] = await req.db.execute("SELECT * FROM videos WHERE id = ?", [videoId]);
      const row = rows[0];

      if (!row) {
          return res.status(404).send("Video not found");
      }

      const bucketName = secret.AWS_BUCKET_NAME;
      const objectKey = `uploads/${row.fileName}`; // 假設 uploadPath 是 S3 的 key

      // 生成預簽名 URL
      const getObjectParams = {
          Bucket: bucketName,
          Key: objectKey,
      };

      const s3Client = await initializeS3Client();

      const command = new GetObjectCommand(getObjectParams);
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

      // 創建臨時文件
      const tempInputFile = tmp.tmpNameSync({ postfix: '.' + objectKey.split('.').pop() });
      const tempOutputFile = tmp.tmpNameSync({ postfix: `.${targetFormat}` });

      // 下載文件到臨時目錄
      const writer = fs.createWriteStream(tempInputFile);
      const response = await axios({
          url: signedUrl,
          method: 'GET',
          responseType: 'stream',
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
      });

      // 使用 ffmpeg 進行轉碼
      ffmpeg(tempInputFile)
          .output(tempOutputFile)
          .size(resolution)
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('progress', (progress) => {
              // Emit progress update
              ffmpegEmitter.emit(videoId, Math.floor(progress.percent));
              console.log(`Progress: ${progress.percent}%`);
          })
          .on('end', async () => {
              console.log('Transcoding succeeded.');
              try {
                  const stats = fs.statSync(tempOutputFile);
                  const fileSize = stats.size; // size in bytes
                  const newFileName = `${row.shortFileName}-transcode.${targetFormat}`;
                  const shortFileName = newFileName.replace(/\.[^/.]+$/, "");

                  // 上傳轉碼後的文件到 S3
                  const fileStream = fs.createReadStream(tempOutputFile);
                  const params = {
                      Bucket: bucketName,
                      Key: `uploads/${newFileName}`, // 您可以根據需要調整路徑
                      Body: fileStream,
                      ContentType: `${targetFormat}`,
                  };

                  const s3Client = await initializeS3Client();

                  const data = await s3Client.send(new PutObjectCommand(params));

                  // 更新數據庫
                  const updateQuery = `
                        UPDATE videos 
                        SET fileName = ?, shortFileName = ?, uploadPath = ?, fileExtension = ?, resolution = ?, fileSize = ?
                        WHERE id = ?
                    `;

                    const newUploadPath = `https://${params.Bucket}.s3.${secret.AWS_REGION}.amazonaws.com/${newFileName}`;

                    await req.db.execute(updateQuery, [
                        newFileName,
                        shortFileName,
                        newUploadPath,
                        targetFormat,
                        resolution,
                        fileSize,
                        videoId
                    ]);

                  ffmpegEmitter.emit(videoId, 100); // 確保 100% 的進度被發送
                  res.send({ message: 'Transcoding succeeded', file: newFileName, size: fileSize });

                  // 清理臨時文件
                  fs.unlinkSync(tempInputFile);
                  fs.unlinkSync(tempOutputFile);
              } catch (err) {
                  console.error("Error after transcoding: " + err.message);
                  res.status(500).send("Error after transcoding: " + err.message);
              }
          })
          .on('error', (transcodeErr) => {
              console.error('Transcoding failed: ' + transcodeErr.message);
              res.status(500).send('Transcoding failed: ' + transcodeErr.message);
          })
          .run();

  } catch (err) {
      console.error("Error: " + err.message);
      res.status(500).send("Error: " + err.message);
  }
});

// generate-upload-url route
router.get('/generate-upload-url', auth.authenticateCookie, async (req, res) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType query parameters' });
  }

  const uniqueFileName = `${Date.now()}-${fileName}`;
  const secret = await getAwsSecret();
  const bucketName = secret.AWS_BUCKET_NAME;
  const key = `uploads/${uniqueFileName}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);

  const s3Client = await initializeS3Client();

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

  const secret = await getAwsSecret();
  const bucketName = secret.AWS_BUCKET_NAME;

  const params = {
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`, // force download
  };

  const command = new GetObjectCommand(params);

  const s3Client = await initializeS3Client();

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

  const secret = await getAwsSecret();
  const bucketName = secret.AWS_BUCKET_NAME;
  const uploadPath = `https://${bucketName}.s3.${secret.AWS_REGION}.amazonaws.com/${key}`;

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

      const s3Client = await initializeS3Client();

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
      const fileNameWithoutExtension = key.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '');

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

router.delete('/delete/:id', auth.authenticateCookie, async (req, res) => {
  const videoId = req.params.id;
  const group = req.group;

  if (group !== 'admin') {
      return res.status(403).send({ message: 'Please contact the administrator.' }); // 403 Forbidden
  }

  // Validate that videoId is a valid number
  if (!/^\d+$/.test(videoId)) {
      console.error(`Received invalid video ID: ${videoId}`);
      return res.status(400).send({ message: 'Invalid video ID.' });
  }

  try {
      // 檢查視頻是否存在
      const [rows] = await req.db.execute("SELECT uploadPath FROM videos WHERE id = ?", [videoId]);

      if (rows.length === 0) {
          console.warn(`Cannot find video ID: ${videoId}`);
          return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
      }

      const uploadPath = rows[0].uploadPath;
      const secret = await getAwsSecret();
      const bucketName = secret.AWS_BUCKET_NAME;

      // 從 uploadPath 中提取 S3 Key
      const s3Key = uploadPath.split(`https://${bucketName}.s3.${secret.AWS_REGION}.amazonaws.com/`)[1];

      // 刪除 S3 上的文件
      const deleteParams = {
          Bucket: bucketName,
          Key: s3Key,
      };

      const s3Client = await initializeS3Client();

      try {
          await s3Client.send(new DeleteObjectCommand(deleteParams));
          console.log(`Successfully deleted file from S3: ${s3Key}`);
      } catch (s3DeleteErr) {
          console.error("Failed to delete file from S3:", s3DeleteErr);
          // 根據需求決定是否繼續刪除資料庫記錄
          return res.status(500).send("Failed to delete file from S3: " + s3DeleteErr.message);
      }

      // 刪除資料庫記錄
      await req.db.execute("DELETE FROM videos WHERE id = ?", [videoId]);

      console.log(`Successfully deleted video ID: ${videoId}`);
      return res.status(200).send({ message: 'Successfully deleted video' });
  } catch (err) {
      console.error("Error deleting video:", err);
      return res.status(500).send({ message: "Error deleting video: " + err.message });
  }
});

// Route to delete a video
// router.delete('/delete/:id', auth.authenticateCookie, (req, res) => {
//   const videoId = req.params.id;
//   const group = req.group;

//   if (group !== 'admin') {
//       return res.status(403).send({ message: 'Please contact the administrator.' }); // 403 Forbidden
//   }

//     // Validate that videoId is a valid number
//     if (!/^\d+$/.test(videoId)) {
//       console.error(`Received invalid video ID: ${videoId}`);
//       return res.status(400).send({ message: 'Invalid video ID.' });
//   }

//   // Check if the video exists in the database
//   req.db.get("SELECT id FROM videos WHERE id = ?", [videoId], (err, row) => {
//       if (err) {
//           console.error(`Database error: ${err.message}`);
//           return res.status(500).send({ message: "Database error" });
//       }

//       if (!row) {
//           console.warn(`Cannot find video ID: ${videoId}`);
//           return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
//       }

//       // Delete the video record from the database
//       req.db.run("DELETE FROM videos WHERE id = ?", [videoId], function(dbErr) {
//           if (dbErr) {
//               console.error(`Delete video unsuccessfully (ID: ${videoId}): ${dbErr.message}`);
//               return res.status(500).send({ message: "Delete video unsuccessfully" });
//           }

//           console.log(`Successfully deleted video ID: ${videoId}`);
//           return res.status(200).send({ message: 'Successfully deleted video' });
//       });
//   });
// });
// // Route to rename a video
// router.put('/rename/:id', auth.authenticateCookie, (req, res) => {
//   const videoId = req.params.id;
//   const newName = req.body.newName;
//   const group = req.group;

//   // Check if the user is an admin
//   if (group !== 'admin') {
//       console.error(`Non-admin user (${group}) attempting to rename video ID: ${videoId}`);
//       return res.status(403).send({ message: 'Please contact the administrator.' }); // 403 Forbidden
//   }

//   // Validate the newName input
//   if (!newName || typeof newName !== 'string' || newName.trim() === "") {
//       console.error(`Invalid new name provided for video ID: ${videoId}`);
//       return res.status(400).send({ message: 'Invalid new name provided.' }); // 400 Bad Request
//   }

//   // Check if the video exists in the database
//   req.db.get("SELECT * FROM videos WHERE id = ?", [videoId], (err, row) => {
//       if (err) {
//           console.error(`Database error: ${err.message}`);
//           return res.status(500).send({ message: "Database error" });
//       }

//       if (!row) {
//           console.error(`Cannot find video ID: ${videoId}`);
//           return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
//       }

//       // Update the shortFileName and fileName in the database
//       const updatedFileName = `${newName}.${row.fileExtension}`; // Assuming the row has fileExtension
//       req.db.run("UPDATE videos SET fileName = ?, shortFileName = ? WHERE id = ?", [updatedFileName, newName, videoId], (updateErr) => {
//           if (updateErr) {
//               console.error(`Failed to update video data (ID: ${videoId}): ${updateErr.message}`);
//               return res.status(500).send({ message: "Failed to update video data in database" });
//           }

//           console.log(`Successfully renamed video ID: ${videoId} to ${newName}`);
//           return res.status(200).send({ message: 'Video renamed successfully' });
//       });
//   });
// });


router.put('/rename/:id', auth.authenticateCookie, async (req, res) => {
  const videoId = req.params.id;
  const newName = req.body.newName;
  const group = req.group;

  // Check if the user is an admin
  if (group !== 'admin') {
      console.error(`Non-admin user (${group}) attempting to rename video ID: ${videoId}`);
      return res.status(403).send({ message: 'Please contact the administrator.' }); // 403 Forbidden
  }

  // Validate the newName input
  if (!newName || typeof newName !== 'string' || newName.trim() === "") {
      console.error(`Invalid new name provided for video ID: ${videoId}`);
      return res.status(400).send({ message: 'Invalid new name provided.' }); // 400 Bad Request
  }

  try {
      // 檢查視頻是否存在
      const [rows] = await req.db.execute("SELECT * FROM videos WHERE id = ?", [videoId]);
      const row = rows[0];

      if (!row) {
          console.error(`Cannot find video ID: ${videoId}`);
          return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
      }

      // 更新 shortFileName 和 fileName
      const updatedFileName = `${newName}.${row.fileExtension}`;
      const shortFileName = newName;

      // 更新資料庫
      await req.db.execute("UPDATE videos SET fileName = ?, shortFileName = ? WHERE id = ?", [
          updatedFileName,
          shortFileName,
          videoId
      ]);

      console.log(`Successfully renamed video ID: ${videoId} to ${newName}`);
      return res.status(200).send({ message: 'Video renamed successfully' });
  } catch (err) {
      console.error("Failed to rename video:", err);
      return res.status(500).send({ message: "Failed to rename video: " + err.message });
  }
});

// router.put('/rename/:id', auth.authenticateCookie, async (req, res) => {
//   const videoId = req.params.id;
//   const newName = req.body.newName;
//   const group = req.group; // 假設 `req.user` 包含 `group` 屬性

//   // 檢查使用者是否為 admin
//   if (group !== 'admin') {
//       console.error(`Non-admin user (${group}) attempting to rename video ID: ${videoId}`);
//       return res.status(403).send({ message: 'Please contact the administrator.' }); // 403 Forbidden
//   }

//   // 驗證 newName 輸入
//   if (!newName || typeof newName !== 'string' || newName.trim() === "") {
//       console.error(`Invalid new name provided for video ID: ${videoId}`);
//       return res.status(400).send({ message: 'Invalid new name provided.' }); // 400 Bad Request
//   }

//   try {
//       // 從資料庫獲取視頻信息
//       const [rows] = await req.db.execute("SELECT * FROM videos WHERE id = ?", [videoId]);
//       const row = rows[0];

//       if (!row) {
//           console.error(`Cannot find video ID: ${videoId}`);
//           return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
//       }

//       // 從 uploadPath 中提取 S3 Key
//       const uploadPath = row.uploadPath;
//       const bucketName = process.env.AWS_BUCKET_NAME;
//       const region = process.env.AWS_REGION;
//       const s3UrlPrefix = `https://${bucketName}.s3.${region}.amazonaws.com/`;
//       if (!uploadPath.startsWith(s3UrlPrefix)) {
//           console.error(`Invalid uploadPath format: ${uploadPath}`);
//           return res.status(400).send({ message: "Invalid uploadPath format." });
//       }

//       const oldS3Key = uploadPath.substring(s3UrlPrefix.length); // e.g., uploads/filename.mp4

//       // 構造新的 S3 Key
//       const fileExtension = row.fileExtension;
//       const newFileName = `${newName}.${fileExtension}`;
//       const newS3Key = `uploads/${newFileName}`;

//       // 執行 S3 複製操作
//       const copyParams = {
//           Bucket: bucketName,
//           CopySource: oldS3Key, 
//           Key: newS3Key,
//       };
//       const copyCommand = new CopyObjectCommand(copyParams);
//       await s3Client.send(copyCommand);
//       console.log(`Successfully copied ${oldS3Key} to ${newS3Key}`);

//       // 執行 S3 刪除操作
//       const deleteParams = {
//           Bucket: bucketName,
//           Key: oldS3Key,
//       };
//       const deleteCommand = new DeleteObjectCommand(deleteParams);
//       await s3Client.send(deleteCommand);
//       console.log(`Successfully deleted old S3 object: ${oldS3Key}`);

//       // 更新資料庫記錄
//       const newUploadPath = `https://${bucketName}.s3.${region}.amazonaws.com/${newS3Key}`;
//       await req.db.execute(
//           "UPDATE videos SET fileName = ?, shortFileName = ?, uploadPath = ? WHERE id = ?",
//           [newFileName, newName, newUploadPath, videoId]
//       );

//       console.log(`Successfully renamed video ID: ${videoId} to ${newName}`);

//       return res.status(200).send({ message: 'Video renamed successfully' });
//   } catch (err) {
//       console.error("Failed to rename video:", err);
//       return res.status(500).send({ message: "Failed to rename video: " + err.message });
//   }
// });


// Serve up static files if they exist in public directory, protected by authentication middleware
router.use("/", auth.authenticateCookie, express.static(path.join(__dirname, "../public")));

module.exports = router;
