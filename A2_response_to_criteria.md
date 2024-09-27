Assignment 2 - Web Server - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Yu-Chia-Sheng KAO (Jerry)
- **Student number:** N11428911 
- **Partner name :** SHENG-WEI TSAI(HENRY) N11570628
- **Application name:** Transcoding Web Application
- **Two line description:** A web application that allows users to upload, transcode, and manage video files. It also provides related YouTube video suggestions based on the uploaded content.
- **EC2 instance name or ID:**  n11428911-assessment2 (i-04f2fa61314eccb3c)

Core criteria
------------------------------------------------

### Core - First data persistence service

- **AWS service name:** S3  
- **What data is being stored?:** video files
- **Why is this service suited to this data?:** S3 is ideal for storing large files like videos due to its scalability, durability, and ability to handle files of various sizes efficiently.
- **Why is are the other services used not suitable for this data?:** RDS and DynamoDB are not suitable for storing large binary files like videos, as they are designed for structured data and have size limitations.
- **Bucket/instance/table name:** n11428911-assessment2
- **Video timestamp:** 00:10
- **Relevant files:**
    - backend/routes/webclient.js 161 (transcode)
    - backend/routes/webclient.js 284 (generate-upload-url)
    - backend/routes/webclient.js 316 (generate-download-url)
    - backend/routes/webclient.js 350 (upload-complete)
    - backend/routes/webclient.js 445 (delete)
    - backend/public/config.js

### Core - Second data persistence service

- **AWS service name:** RDS (MySQL)
- **What data is being stored?:** video metadata and user information 
- **Why is this service suited to this data?:** RDS is suitable for storing structured data like video metadata and user information, allowing for complex queries and relationships between data.
- **Why is are the other services used not suitable for this data?:**  S3 is not designed for structured data and doesn't support complex queries. DynamoDB might not be as efficient for complex relational data that video metadata might require.
- **Video timestamp:** 00:22
- **Relevant files:**
    -  backend/index.js
    -  backend/db.js


### S3 Pre-signed URLs

- **S3 Bucket names:** n11428911-assessment2
- **Video timestamp:** 00:54
- **Relevant files:**
    - backend/routes/webclient.js 284 (generate-upload-url)
    - backend/routes/webclient.js 316 (generate-download-url)
    - backend/routes/webclient.js 350 (upload-complete)


### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Temporary files during video processing
- **Why is this data not considered persistent state?:** These temporary files are created during transcoding and can be recreated from the source if lost.
- **How does your application ensure data consistency if the app suddenly stops?:** The application uses S3 for persistent storage and only keeps temporary files locally during processing. If the app stops, it can resume from the last known state in S3 and RDS.
- **Relevant files:**
    - backend/routes/webclient.js
    - backend/db.js


### Core - Authentication with Cognito

- **User pool name:** n11428911-cognito-assessment2
- **How are authentication tokens handled by the client?:**  The client stores the authentication token in a cookie after successful login.
- **Video timestamp:** 01:30
- **Relevant files:**
    - frontend/src/Components/Login.jsx
    - frontend/src/Components/SignUp.jsx
    - backend/routes/webclient.js
    - backend/routes/api.js


### Cognito federated identities

- **Identity providers used:** google
- **Video timestamp:** 02:20
- **Relevant files:**
    - frontend/src/Components/Login.jsx

### Cognito groups

- **How are groups used to set permissions?:** 'admin' users can delete and rename videos, normal user cannot.
- **Video timestamp:** 02:46
- **Relevant files:**
    - backend/auth.js
    - backend/routes/webclient.js
    - backend/routes/api.js

### Core - DNS with Route53

- **Subdomain**: http://n11428911-a2.cab432.com
- **Video timestamp:** 03:38


### Custom security groups

- **Security group names:** N11570628-www-dev-A2
- **Services/instances using security groups:** EC2 instance: n11428911-assessment2 (i-04f2fa61314eccb3c), RDS: n11428911-assessment-2
- **Video timestamp:** 04:05
- **Relevant files:**
    - 

### Parameter store

- **Parameter names:**   - /n11428911/assessment2
  - /n11428911/googleApiVideos
  - /n11428911/googleApiSearch
- **Video timestamp:** 04:26
- **Relevant files:**
    - backend/index.js
    - backend/public/awsParameter.js
    - backend/function/googleAPI.js

### Secrets manager

- **Secrets names:** n11428911-backend
- **Video timestamp:** 05:05
- **Relevant files:**
    - backend/public/awsSecret.js
    - backend/db.js
    - backend/auth.js
    - backend/index.js
    - backend/routes/webclient.js
    - backend/routes/api.js

