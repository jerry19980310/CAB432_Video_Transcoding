// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const path = require("path");
require('dotenv').config();
const cors = require("cors"); 
const initializeDatabaseAndPool = require("./db"); // 引入初始化函數

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS if your frontend runs on a different domain or port
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
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

// Import the API routes
const apiRouter = require("./routes/api");
const webclientRouter = require("./routes/webclient");

// const dropUsersTable = async (pool) => {
//     const dropTableQuery = `
//         DROP TABLE IF EXISTS users;
//     `;
//     try {
//         await pool.execute(dropTableQuery);
//         console.log('Users 表已刪除（如果存在）。');
//     } catch (err) {
//         console.error('刪除 users 表時出錯:', err);
//         throw err; // 重新拋出錯誤以阻止伺服器啟動
//     }
// };

// const dropVideosTable = async (pool) => {
//     const dropTableQuery = `
//         DROP TABLE IF EXISTS videos;
//     `;
//     try {
//         await pool.execute(dropTableQuery);
//         console.log('videos 表已刪除（如果存在）。');
//     } catch (err) {
//         console.error('刪除 videos 表時出錯:', err);
//         throw err; // 重新拋出錯誤以阻止伺服器啟動
//     }
// };

/**
 * 函數：創建 users 表
 */
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
        console.log('Users 表已創建或已存在。');
    } catch (err) {
        console.error('創建 users 表時出錯:', err);
        throw err; // 重新拋出錯誤以阻止伺服器啟動
    }
};

/**
 * 函數：創建 videos 表
 */
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
        console.log('Videos 表已創建或已存在。');
    } catch (err) {
        console.error('創建 videos 表時出錯:', err);
        throw err; // 重新拋出錯誤以阻止伺服器啟動
    }
};

/**
 * 函數：初始化資料庫表
 */
const initializeDatabaseTables = async (pool) => {
    // await dropVideosTable(pool);
    // await dropUsersTable(pool);
    await createUsersTable(pool);
    await createVideosTable(pool);
};

/**
 * 主函數：初始化資料庫並啟動伺服器
 */
const startServer = async () => {
    try {
        const pool = await initializeDatabaseAndPool(); // 初始化資料庫和連接池
        console.log('成功連接到資料庫。');

        // Middleware to attach the db to the req object (optional)
        app.use((req, res, next) => {
            req.db = pool;
            next();
        });

        // 初始化資料庫表
        await initializeDatabaseTables(pool);

        // 使用路由
        app.use("/api", apiRouter);
        app.use("/", webclientRouter);

        // 啟動伺服器
        app.listen(port, () => {
            console.log(`伺服器正在監聽端口 ${port}。`);
        });
    } catch (err) {
        console.error('資料庫初始化失敗，伺服器未啟動。', err);
        process.exit(1); // 以失敗狀態碼退出
    }
};

// 啟動伺服器
startServer();