const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
require('dotenv').config();
const { getAwsSecret } = require('./public/awsSecret.js');

// 配置 JWKS 客戶端
let client;
let jwksUri;
let secret;

// 根據 JWT 的 kid 獲取對應的公鑰
function getKey(header, callback) {
    client.getSigningKey(header.kid, function(err, key) {
        if (err) {
            callback(err, null);
        } else {
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        }
    });
}

// 初始化 AWS Cognito 配置信息，確保在之後再使用該配置信息進行 JWT 驗證
const initializeAuth = async () => {
    try {
        const secret = await getAwsSecret(); // 獲取 AWS Secret

        const userPoolId = secret.COGNITO_USER_POOL_ID;
        const region = secret.AWS_REGION;

        // 配置 JWKS Uri 和客戶端
        jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
        client = jwksClient({
            jwksUri: jwksUri
        });

        console.log('Auth configuration initialized successfully');
    } catch (error) {
        console.error('Error initializing auth configuration:', error);
        throw error;
    }
};

// 驗證 ID Token 的中介軟件（通常用於前端應用）
const authenticateCookie = async (req, res, next) => {
    const token = req.cookies.token; // 假設您將 ID Token 存儲在 token Cookie 中
    const secret = await getAwsSecret(); 

    if (!token) {
        console.log("Cookie auth token missing.");
        return res.redirect("/login");
    }

    // 等待 Cognito 配置信息加載
    await initializeAuth();

    jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${secret.AWS_REGION}.amazonaws.com/${secret.COGNITO_USER_POOL_ID}`,
    }, (err, decoded) => {
        if (err) {
            console.error("JWT verification failed:", err);
            return res.redirect("/login");
        }

        req.user = decoded['cognito:username'];
        const group = decoded['cognito:groups'];
        req.group = group[0];
        const username = decoded['cognito:username'];
        console.log(`authTokencook verified for user: ${username} at URL ${req.url}`);
        next();
    });
};

// 驗證 Access Token 的中介軟件（通常用於 API 調用）
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("JSON web token missing.");
        return res.sendStatus(401); // 未授權
    }

    // 等待 Cognito 配置信息加載
    await initializeAuth();

    jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${secret.AWS_REGION}.amazonaws.com/${secret.COGNITO_USER_POOL_ID}`,
    }, (err, decoded) => {
        if (err) {
            console.error("JWT verification failed:", err);
            return res.sendStatus(403); // 禁止訪問
        }

        req.user = decoded; // 將用戶信息附加到請求對象
        console.log(`authToken verified for user: ${decoded.username} at URL ${req.url}`);
        next();
    });
};

// 將初始化和中間件導出
module.exports = { initializeAuth, authenticateCookie, authenticateToken };