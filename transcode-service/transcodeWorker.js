const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const tmp = require('tmp');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const initializeS3Client = require('./public/config');
const { getAwsSecret } = require('./public/awsSecret'); 
const initializeDatabaseAndPool = require("./db");

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const POLLING_INTERVAL = 5000; // 5 seconds

async function processMessage(message) {
  const { jobId } = JSON.parse(message.Body);
  console.log(`Processing job ID: ${jobId}`);
  
  db = await initializeDatabaseAndPool();

  const secret = await getAwsSecret();

  // Fetch the transcode job from the database
  const [jobRows] = await db.query("SELECT * FROM transcode_jobs WHERE id = ?", [jobId]);
  const job = jobRows[0];

  if (!job) {
    throw new Error(`Transcode job with ID ${jobId} not found.`);
  }


  if (!job || job.status === 'completed' || job.status === 'transcoding') {
    // 跳过处理
    console.log(`Job ${jobId} has been processed.`);
    return;
  }

  const { videoId, targetFormat, resolution, userName } = job;

  try {
    // Fetch video details from DB
    const [rows] = await db.query("SELECT * FROM videos WHERE id = ?", [videoId]);
    const video = rows[0];

    console.log('Video:', video);

    if (!video) {
      throw new Error(`Video with ID ${videoId} not found.`);
    }

    // Update job status to 'transcoding'
    await db.execute("UPDATE transcode_jobs SET status = 'transcoding' WHERE id = ?", [jobId]);

    const bucketName = secret.AWS_BUCKET_NAME;
    const objectKey = `uploads/${video.fileName}`;

    // Get signed URL for the input video
    const getObjectParams = { Bucket: bucketName, Key: objectKey };
    const command = new GetObjectCommand(getObjectParams);
    console.log(getObjectParams);
    const s3Client = await initializeS3Client();
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    console.log(signedUrl);

    

    // Create temporary files
    const tempInputFile = tmp.tmpNameSync({ postfix: path.extname(objectKey) });
    const tempOutputFile = tmp.tmpNameSync({ postfix: `.${targetFormat}` });

    // Download the input video
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
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputFile)
        .output(tempOutputFile)
        .size(resolution)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('progress', async (progress) => {
          const percent = Math.floor(progress.percent);
          console.log(`Transcoding Progress: ${percent}%`);
          // Update progress in the database
          await db.execute("UPDATE transcode_jobs SET progress = ? WHERE id = ?", [percent, jobId]);
        })
        .on('end', async () => {
          console.log('Transcoding completed.');
          await db.execute("UPDATE transcode_jobs SET progress = 100, status = 'completed' WHERE id = ?", [jobId]);
          resolve();
        })
        .on('error', async (err) => {
          console.error('Transcoding error:', err);
          await db.execute("UPDATE transcode_jobs SET status = 'failed' WHERE id = ?", [jobId]);
          reject(err);
        })
        .run();
    });

    // Upload the transcoded video to S3
    const newFileName = `${video.shortFileName}-transcode.${targetFormat}`;
    const newObjectKey = `uploads/${newFileName}`;
    const fileStream = fs.createReadStream(tempOutputFile);

    const uploadParams = {
      Bucket: bucketName,
      Key: newObjectKey,
      Body: fileStream,
      ContentType: `video/${targetFormat}`,
    };

    const putCommand = new PutObjectCommand(uploadParams);

    try {
      const response = await s3Client.send(putCommand);
      console.log(response);
  } catch (err) {
      console.log(err);
  }

    // Update the database with the new video details
    const newUploadPath = `https://${bucketName}.s3.${secret.AWS_REGION}.amazonaws.com/${newFileName}`;
    const fileSize = fs.statSync(tempOutputFile).size;

    await db.execute(`
      UPDATE videos 
      SET fileName = ?, shortFileName = ?, uploadPath = ?, fileExtension = ?, resolution = ?, fileSize = ?
      WHERE id = ?
    `, [
      newFileName,
      newFileName.replace(/\.[^/.]+$/, ""),
      newUploadPath,
      targetFormat,
      resolution,
      fileSize,
      videoId
    ]);

    // Clean up temporary files
    fs.unlinkSync(tempInputFile);
    fs.unlinkSync(tempOutputFile);

    console.log(`Transcoding job for video ID ${videoId} completed successfully.`);
  } catch (error) {
    console.error(`Error processing video ID ${videoId}:`, error);
    const db = await initializeDatabaseAndPool();
    await db.execute("UPDATE transcode_jobs SET status = 'failed' WHERE id = ?", [jobId]);
  }
}

async function pollQueue() {

  const secret = await getAwsSecret();

  const sqsClient = new SQSClient({ region: secret.AWS_REGION });
  const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

  console.log(process.env.SQS_QUEUE_URL);

  try {
    const params = {
      QueueUrl: SQS_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // Long polling
    };

    const command = new ReceiveMessageCommand(params);
    const data = await sqsClient.send(command);

    console.log('Received messages:', data.Messages);

    if (data.Messages) {
      for (const message of data.Messages) {
        await processMessage(message);

        // Delete the message after processing
        const deleteParams = {
          QueueUrl: SQS_QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        };
        const deleteCommand = new DeleteMessageCommand(deleteParams);
        await sqsClient.send(deleteCommand);
      }
    }
  } catch (error) {
    console.error('Error polling SQS:', error);
  } finally {
    setTimeout(pollQueue, POLLING_INTERVAL);
  }
}

// Start polling
pollQueue();
