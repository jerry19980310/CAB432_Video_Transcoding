const express = require("express");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const sqlite3 = require('sqlite3').verbose();
const path = require("path");
require('dotenv').config();
const cors = require("cors"); 

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS if your frontend runs on a different domain or port
app.use(cors({
    origin: "http://localhost:3000",  // Your frontend's origin
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "./temp"
}));

// Parse urlencoded bodies for POST form parameters
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database('./videoData.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database: ' + err.message);
        return;
    }
    console.log('Connected to the SQLite database.');

    // Create 'users' table if it does not exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`, [], (err) => {
        if (err) {
            console.error('Error creating users table: ' + err.message);
        }
    });

    // Create 'videos' table if it does not exist
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName TEXT NOT NULL,
        shortFileName TEXT NOT NULL,
        fileExtension TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        uploadPath TEXT NOT NULL,
        userName TEXT NOT NULL,
        uploadTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration REAL,
        bitrate INTEGER,
        resolution TEXT
    )`, [], (err) => {
        if (err) {
            console.error('Error creating videos table: ' + err.message);
        }
    });
});

// Middleware to attach the db to the req object
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Import the API routes
const apiRoute = require("./routes/api.js");
app.use("/api", apiRoute);

const webclientRoute = require("./routes/webclient.js");
app.use("/", webclientRoute);

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
});