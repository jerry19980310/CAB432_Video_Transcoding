# Transcoding Web Application - Deployed via AWS

## Overview
This project is a **Transcoding Web Application** that allows users to upload, transcode, and manage video files. The application also suggests related YouTube videos based on the content of the uploaded videos.

---

## Workflow Summary

1. **User Access and Authentication**:
   - Users access the frontend served by CloudFront.
   - Authentication is managed by AWS Cognito.

2. **Video Upload**:
   - Authenticated users upload videos to an S3 bucket.
   - S3 triggers Lambda functions when new videos are uploaded.

3. **Virus Scanning**:
   - Lambda sends a message to the SQS Scanning Queue.
   - The Scanning Service retrieves the message, scans the video for viruses using ClamAV, and updates the status in RDS.

4. **Video Transcoding**:
   - After successful scanning, the Scanning Service places a message in the SQS Transcoding Queue.
   - The Transcoding Service processes the video and stores the output in S3.

5. **Content Delivery**:
   - Processed videos are delivered to users through CloudFront, ensuring faster load times with edge caching.

6. **API Interactions**:
   - The frontend communicates with the backend API through the ALB, handling user data and video statuses.

---

## Services and Components

### Amazon S3 (Simple Storage Service)
- **Frontend Hosting**: Stores and serves the React frontend.
- **Video Storage**: Stores user-uploaded videos and transcoded outputs.
- **Event Triggering**: Generates events on video uploads to initiate scanning.

### Amazon CloudFront
- **Edge Caching**: Caches static assets (JS, CSS, HTML) for faster delivery.
![CloudFront1](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Cloudfront1.png)
![CloudFront2](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Cloudfront2.png)

### AWS Cognito
- **Authentication and Authorization**: Manages user signup, signin, and access control.
![Cognito](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Cognito.png)

### Amazon ECS (Elastic Container Service)
- **API Service**: Hosts Docker containers running the backend API.
- **Scanning Service**: Runs containers with ClamAV to scan videos.
- **Transcoding Service**: Handles video transcoding with FFmpeg.
![ECS](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/ECS.png)

### AWS Lambda
- **Event Handling**: Triggered by S3 events to initiate scanning and transcoding.
- **Orchestration**: Coordinates processes between S3, scanning, and transcoding services.
![Lambda](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Lambda.png)


### Amazon SQS (Simple Queue Service)
- **Scanning Queue**: Receives messages for virus scanning tasks.
- **Transcoding Queue**: Receives messages for transcoding tasks.
![SQS](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/SQS.png)

### Application Load Balancer (ALB)
- **Traffic Distribution**: Routes incoming requests to the ECS services.
- **Security**: Works with AWS Certificate Manager for SSL termination.
![ALB](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/ALB.png)

### AWS Certificate Manager (ACM)
- **SSL/TLS Management**: Manages certificates for secure communication.
![ACM](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/ACM.png)

### Amazon RDS (Relational Database Service)
- **Database Management**: Stores user information, video metadata, and statuses.

### AWS Secrets Manager and Systems Manager Parameter Store
- **Secret Storage**: Securely stores sensitive data like API keys and credentials.
- **Configuration Management**: Manages application configurations.
![Secrets](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Secrets.png)
![Parameter](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/Parameter.png)

### Auto Scaling Groups
- **Scalability**: Adjusts ECS task count based on load.
![Auto Scaling](https://raw.githubusercontent.com/jerry19980310/Project-Demo/refs/heads/main/Transcoding/AutoScaling%20.png)

---

## Microservices Overview

### Core Microservices

1. **API Service**
   - **Functionality**: Provides a public-facing API.
   - **Compute**: ECS Clusters: n11428911-a3
   - **Source**: `backend/`

2. **Transcoding Service**
   - **Functionality**: Transcodes videos from SQS messages.
   - **Compute**: ECS Clusters: n11428911-a3
   - **Source**: `transcode-service/`

3. **Scan SQS Service**
   - **Functionality**: Sends SQS messages for newly uploaded files.
   - **Compute**: Lambda: n11428911-a3-scan-sqs
   - **Source**: `Lambda_Function/index.mjs`

4. **Scanner Service**
   - **Functionality**: Scans uploaded files using ClamAV.
   - **Compute**: ECS Clusters: n11428911-a3
   - **Source**: `ClamAV/`

---

## Security and Configuration

### Cognito Integration
- **Identity Providers**: Google
- **Groups**: Admins can delete/rename videos; regular users cannot.
- **Token Handling**: Authentication tokens stored in cookies.

### Route53 DNS Configuration
- **Domain**: n11428911-a2.cab432.com

### Parameter Store and Secrets Manager
- **Parameter Names**: `/n11428911/assessment2`, `/n11428911/googleApiVideos`
- **Secrets**: `n11428911-backend`

### Infrastructure as Code
- **Technology**: CloudFormation
- **Deployed Services**: EC2, S3, RDS, Parameter Store

---

## Additional Notes

### Video Processing Workflow
- **Video Upload**: Upon uploading, the video triggers an S3 event to initiate virus scanning.
- **Scanning**: The video is scanned for viruses, and once clear, it moves to the transcoding queue.
- **Transcoding**: After processing, the video is stored in S3 for delivery.
- **Content Delivery**: Processed videos are delivered to users with CloudFront, utilizing caching for enhanced performance.

### Edge Caching with CloudFront
- **Cache**: JavaScript, CSS, and HTML files are cached at edge locations for faster delivery.
- **Performance**: Caching reduces latency and load on the S3 origin server.

---

## File Structure

### Backend
- `backend/`: Contains the backend source code for API and services.

### Lambda Functions
- `Lambda_Function/index.mjs`: Lambda function for SQS message handling and scanning.

### Frontend
- `frontend/`: React application stored and served from S3.

---

