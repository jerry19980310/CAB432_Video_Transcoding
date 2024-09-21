require('dotenv').config();

const { S3Client } = require('@aws-sdk/client-s3');

// 创建 S3 客户端实例
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

module.exports = { s3Client };