require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * 函數：創建資料庫（如果尚不存在）
 */
const createDatabase = async () => {
    try {
        // 連接到 MySQL 伺服器，不指定資料庫
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true // 允許執行多條語句
        });

        // 創建資料庫（如果尚不存在）
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        console.log(`資料庫 '${process.env.DB_NAME}' 已創建或已存在。`);

        // 關閉無資料庫的連接
        await connection.end();
    } catch (err) {
        console.error('創建資料庫時出錯:', err);
        throw err; // 重新拋出錯誤以阻止應用啟動
    }
};

/**
 * 函數：初始化連接池
 */
const initializePool = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 10000 // 10 秒
        });
        return pool;
    } catch (err) {
        console.error('初始化連接池時出錯:', err);
        throw err;
    }
};

/**
 * 函數：初始化資料庫和連接池
 */
const initializeDatabaseAndPool = async () => {
    await createDatabase();        // 創建資料庫
    const pool = await initializePool(); // 初始化連接池
    return pool;
};

module.exports = initializeDatabaseAndPool;