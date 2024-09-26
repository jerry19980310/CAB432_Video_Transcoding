require('dotenv').config();
const mysql = require('mysql2/promise');
const { getAwsSecret } = require('./public/awsSecret.js');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const secret_name_DB = "n11428911-RDS";
const client = new SecretsManagerClient({ region: "ap-southeast-2" });


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


const createDatabase = async (dbName) => {
  const secret = await getAwsDBSecret();

  try {
    const connection = await mysql.createConnection({
      host: secret.host,
      user: secret.username,
      password: secret.password,
      port: secret.port || 3306,
      multipleStatements: true, 
    });

    // create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database '${dbName}' created successfully or exists.`);

    await connection.end();
  } catch (err) {
    console.error("Create database unsuccessfully:", err);
    throw err; 
  }
};


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
      connectTimeout: 10000, 
    });
    return pool;
  } catch (err) {
    console.error("initialize error:", err);
    throw err;
  }
};

const initializeDatabaseAndPool = async () => {
  // get database name from AWS Secrets Manager
  const secret = await getAwsSecret();
  const dbName = secret.DB_NAME;

  // ensure database is created
  await createDatabase(dbName); // create database if not exists
  const pool = await initializePool(dbName); // initialize database connection pool
  return pool;
};

module.exports = initializeDatabaseAndPool;