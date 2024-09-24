const { getAwsSecret } = require('./awsSecret.js');
const { S3Client } = require('@aws-sdk/client-s3');


const initializeS3Client = async () => {

  try {
    const awsSecret = await getAwsSecret();
    const region = awsSecret.AWS_REGION || 'ap-southeast-2'; // Default region if not specified

    // Create S3 client instance
    s3Client = new S3Client({
      region: region,
    });

    return s3Client;
  } catch (error) {
    console.error('Error initializing S3 client:', error);
    throw error;
  }
};

module.exports =  initializeS3Client;