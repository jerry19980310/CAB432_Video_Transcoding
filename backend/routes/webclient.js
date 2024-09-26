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

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const awsSecret = await getAwsSecret();
  const CLIENT_ID = awsSecret.COGNITO_CLIENT_ID;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      const { IdToken, AccessToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

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
      return res.status(500).json({
        success: false,
        message: "Login failed. Please try again later.",
      });
    }
  } catch (error) {
    if (error.name === "NotAuthorizedException") {
      return res.status(403).json({ success: false, message: "Invalid credentials" });
    } else if (error.name === "UserNotFoundException") {
      return res.status(403).json({ success: false, message: "User does not exist" });
    } else if (error.name === "UserNotConfirmedException") {
      return res.status(403).json({ success: false, message: "User is not confirmed. Please verify your email." });
    } else {
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
      //fetch video from database
      const [rows] = await req.db.execute("SELECT * FROM videos WHERE id = ?", [videoId]);
      const row = rows[0];

      if (!row) {
          return res.status(404).send("Video not found");
      }

      const bucketName = secret.AWS_BUCKET_NAME;
      const objectKey = `uploads/${row.fileName}`;

      // get the signed URL for the object
      const getObjectParams = {
          Bucket: bucketName,
          Key: objectKey,
      };

      const s3Client = await initializeS3Client();

      const command = new GetObjectCommand(getObjectParams);
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

      // Create temporary input and output files
      const tempInputFile = tmp.tmpNameSync({ postfix: '.' + objectKey.split('.').pop() });
      const tempOutputFile = tmp.tmpNameSync({ postfix: `.${targetFormat}` });

      // Download the file from S3
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

      // Transcode the video
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

                  // Upload the transcoded file to S3
                  const fileStream = fs.createReadStream(tempOutputFile);
                  const params = {
                      Bucket: bucketName,
                      Key: `uploads/${newFileName}`, // 您可以根據需要調整路徑
                      Body: fileStream,
                      ContentType: `${targetFormat}`,
                  };

                  const s3Client = await initializeS3Client();

                  const data = await s3Client.send(new PutObjectCommand(params));

                  // Update the database record
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

                  ffmpegEmitter.emit(videoId, 100); // Emit 100% progress
                  res.send({ message: 'Transcoding succeeded', file: newFileName, size: fileSize });

                  // Delete temporary files
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
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // set the URL to expire in 60 seconds
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
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
      }

      // download the file from S3
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

      // buffer the file
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      fs.writeFileSync(tempFilePath, buffer);

      // get video metadata
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

      // delete the temp file
      fs.unlinkSync(tempFilePath);

      // insert the video metadata into the database
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

      // search for related videos on YouTube
      const relatedVideos = await searchYouTube(fileNameWithoutExtension, 10);

      // return the response
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
      // check if the video exists in the database
      const [rows] = await req.db.execute("SELECT uploadPath FROM videos WHERE id = ?", [videoId]);

      if (rows.length === 0) {
          console.warn(`Cannot find video ID: ${videoId}`);
          return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
      }

      const uploadPath = rows[0].uploadPath;
      const secret = await getAwsSecret();
      const bucketName = secret.AWS_BUCKET_NAME;

      // Extract the S3 Key from the uploadPath
      const s3Key = uploadPath.split(`https://${bucketName}.s3.${secret.AWS_REGION}.amazonaws.com/`)[1];

      // Delete the file from S3
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
          // Return an error response if the file deletion fails
          return res.status(500).send("Failed to delete file from S3: " + s3DeleteErr.message);
      }

      // Delete the video record from the database
      await req.db.execute("DELETE FROM videos WHERE id = ?", [videoId]);

      console.log(`Successfully deleted video ID: ${videoId}`);
      return res.status(200).send({ message: 'Successfully deleted video' });
  } catch (err) {
      console.error("Error deleting video:", err);
      return res.status(500).send({ message: "Error deleting video: " + err.message });
  }
});

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
      // Fetch video information from
      const [rows] = await req.db.execute("SELECT * FROM videos WHERE id = ?", [videoId]);
      const row = rows[0];

      if (!row) {
          console.error(`Cannot find video ID: ${videoId}`);
          return res.status(404).send({ message: "Cannot find the video" }); // 404 Not Found
      }

      // Update the database
      const updatedFileName = `${newName}.${row.fileExtension}`;
      const shortFileName = newName;

      // Update the database record
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

// Serve up static files if they exist in public directory, protected by authentication middleware
router.use("/", auth.authenticateCookie, express.static(path.join(__dirname, "../public")));

module.exports = router;
