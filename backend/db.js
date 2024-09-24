require('dotenv').config();
const mysql = require('mysql2/promise');
const { getAwsSecret } = require('./public/awsSecret.js');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const secret_name_DB = "n11428911-RDS";
const client = new SecretsManagerClient({ region: "ap-southeast-2" });

/**
 * 函數：從 AWS Secrets Manager 獲取 DB 密鑰
 */
const getAwsDBSecret = async () => {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name_DB,
      })
    );
    const secret = response.SecretString;
    return JSON.parse(secret);
  } catch (error) {
    console.log(error);
  }
};

/**
 * 函數：創建資料庫（如果尚不存在）
 */
const createDatabase = async (dbName) => {
  const secret = await getAwsDBSecret();

  try {
    // 連接到 MySQL 伺服器，不指定資料庫
    const connection = await mysql.createConnection({
      host: secret.host,
      user: secret.username,
      password: secret.password,
      port: secret.port || 3306,
      multipleStatements: true, // 允許執行多條語句
    });

    // 創建資料庫（如果尚不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`資料庫 '${dbName}' 已創建或已存在。`);

    // 關閉無資料庫的連接
    await connection.end();
  } catch (err) {
    console.log(`資料庫 '${dbName}'`);
    console.error("創建資料庫時出錯:", err);
    throw err; // 重新拋出錯誤以阻止應用啟動
  }
};

/**
 * 函數：初始化連接池
 */
const initializePool = async (dbName) => {
  const secret = await getAwsDBSecret();
  try {
    const pool = mysql.createPool({
      host: secret.host,
      user: secret.username,
      password: secret.password,
      database: dbName,
      port: secret.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000, // 10 秒
    });
    return pool;
  } catch (err) {
    console.error("初始化連接池時出錯:", err);
    throw err;
  }
};

/**
 * 函數：初始化資料庫和連接池
 */
const initializeDatabaseAndPool = async () => {
  // 先取得 AWS Secret 中的 DB_NAME
  const secret = await getAwsSecret();
  const dbName = secret.DB_NAME;

  // 確保 dbName 獲取成功後再繼續創建資料庫和初始化連接池
  await createDatabase(dbName); // 創建資料庫
  const pool = await initializePool(dbName); // 初始化連接池
  return pool;
};

module.exports = initializeDatabaseAndPool;