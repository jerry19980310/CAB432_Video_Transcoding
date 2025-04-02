const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const tmp = require('tmp');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const initializeS3Client = require('./public/config');
const { getAwsSecret } = require('./public/awsSecret'); 

dotenv.config();

const POLLING_INTERVAL = 5000; // 5 seconds

async function processMessage(message) {
  const { bucket, key } = JSON.parse(message.Body);
  console.log(`Processing file: ${key} from bucket: ${bucket}`);
  
  const s3Client = await initializeS3Client();
  
  try {
    // pre-signed URL
    const getObjectParams = { Bucket: bucket, Key: key };
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // Create temp files
    const tempInputFile = tmp.tmpNameSync({ postfix: path.extname(key) });
    const tempLogFile = tmp.tmpNameSync({ postfix: '.json' });

    // Download file
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

    // Scan file
    const { exec } = require('child_process');
    const scanResult = await new Promise((resolve, reject) => {
      exec(`clamscan "${tempInputFile}"`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ClamAV scan failed: ${stderr}`));
          return;
        }
        resolve(stdout);
      });
    });

    console.log(`ClamAV scan result: ${scanResult}`);

    // read scan result
    let isClean = true;
    let reason = 'File is clean.';
    if (scanResult.includes('FOUND')) {
      isClean = false;
      reason = 'Virus detected.';
    }

    // Log scan result
    const logEntry = {
      file_name: key,
      scan_result: isClean ? 'Clean' : 'Infected',
      reason: reason,
      timestamp: new Date().toISOString()
    };

    const result = isClean ? 'Clean' : 'Infected';

    // Upload log
    const logKey = `logs/${new Date().toISOString().replace(/[:.-]/g, '')}_${path.basename(key)}_${result}.json`;
    const uploadLogParams = {
      Bucket: bucket,
      Key: logKey,
      Body: JSON.stringify(logEntry),
      ContentType: 'application/json'
    };
    const putLogCommand = new PutObjectCommand(uploadLogParams);
    await s3Client.send(putLogCommand);
    console.log(`Uploaded log to ${logKey}`);

    // Move infected file to quarantine
    // if (!isClean) {
    //   const quarantineKey = `quarantine/${path.basename(key)}`;
    //   await s3Client.send(new PutObjectCommand({
    //     Bucket: bucket,
    //     Key: quarantineKey,
    //     Body: fs.createReadStream(tempInputFile)
    //   }));
    //   await s3Client.send(new DeleteMessageCommand({
    //     QueueUrl: process.env.SQS_QUEUE_URL,
    //     ReceiptHandle: message.ReceiptHandle
    //   }));
    //   console.log(`Moved infected file to ${quarantineKey} and deleted original file.`);
    // }

  } catch (error) {
    console.error(`Error processing file ${key}: ${error.message}`);
    throw error;
  }
}

async function pollQueue() {
  const secret = await getAwsSecret();

  const sqsClient = new SQSClient({ region: secret.AWS_REGION });
  const SQS_QUEUE_URL = "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11428911-a3-scan";

  console.log(`Polling SQS Queue: ${SQS_QUEUE_URL}`);

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
        try {
          await processMessage(message);

          // Delete message
          const deleteParams = {
            QueueUrl: SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          };
          const deleteCommand = new DeleteMessageCommand(deleteParams);
          await sqsClient.send(deleteCommand);

          console.log(`Deleted message for ${message.Body}`);
        } catch (error) {
          console.error(`Failed to process message: ${error.message}`);
        }
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