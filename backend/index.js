const express = require("express");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const path = require("path");
const { getAwsSecret } = require("./public/awsSecret");
const { getAwsParameterAssessment2 } = require("./public/awsParameter");
require('dotenv').config();
const cors = require("cors"); 
const initializeDatabaseAndPool = require("./db");

const app = express();
const port = getAwsSecret().PORT || 3001;



// Enable CORS if your frontend runs on a different domain or port
async function setupCors() {
    // Wait for the promise to resolve and assign the resolved value to clientUrl
    const clientUrl = await getAwsParameterAssessment2();
  
    // Now clientUrl is guaranteed to have the resolved value, and you can proceed
    console.log(clientUrl); // This will print the actual value, not a pending promise
  
    const allowedOrigins = [
      process.env.CLIENT_URL,
      clientUrl, // clientUrl now has the resolved value from getAwsParameter
    ];
  
    // Configure CORS middleware
    app.use(cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true); // Allow requests with no origin (e.g., Postman)
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true); // Allow the request
        } else {
          callback(new Error('Not allowed by CORS')); // Reject the request
        }
      },
      methods: ['GET', 'POST', 'DELETE', 'PUT'],
      credentials: true
    }));
  
    // Any other logic that needs to happen after clientUrl is set
}
  
// Call the function to set up CORS
setupCors();

app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "./temp"
}));

// Parse urlencoded bodies for POST form parameters
app.use(express.urlencoded({ extended: true }));

// Import the API routes
const apiRouter = require("./routes/api");
const webclientRouter = require("./routes/webclient");


const createUsersTable = async (pool) => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            cognito_user_id VARCHAR(255) NOT NULL
        );
    `;
    try {
        await pool.execute(createTableQuery);
        console.log('Users table created successfully or exists.');
    } catch (err) {
        console.error('Users table created error:', err);
        throw err;
    }
};

const createVideosTable = async (pool) => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS videos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fileName VARCHAR(255) NOT NULL,
            shortFileName VARCHAR(255) NOT NULL,
            fileExtension VARCHAR(10) NOT NULL,
            fileSize INT NOT NULL,
            uploadPath VARCHAR(255) NOT NULL,
            userName VARCHAR(255) NOT NULL,
            uploadTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration FLOAT,
            bitrate INT,
            resolution VARCHAR(50),
            FOREIGN KEY (userName) REFERENCES users(username) ON DELETE CASCADE
        );
    `;
    try {
        await pool.execute(createTableQuery);
        console.log('Videos table created successfully or exists.');
    } catch (err) {
        console.error('Users table created error:', err);
        throw err;
    }
};

const initializeDatabaseTables = async (pool) => {
    await createUsersTable(pool);
    await createVideosTable(pool);
};


const startServer = async () => {
    try {
        const pool = await initializeDatabaseAndPool();
        console.log('Connected to the database.');

        // Middleware to attach the db to the req object (optional)
        app.use((req, res, next) => {
            req.db = pool;
            next();
        });

        await initializeDatabaseTables(pool);

        app.use("/api", apiRouter);
        app.use("/", webclientRouter);

        app.listen(port, () => {
            console.log(`Server listen ${port}。`);
        });
    } catch (err) {
        console.error('Database initialize error', err);
        process.exit(1);
    }
};

startServer();