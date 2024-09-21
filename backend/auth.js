// auth.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
require('dotenv').config();

// 從環境變數中獲取 Cognito 信息
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const region = process.env.AWS_REGION;
const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

// 配置 JWKS 客戶端
const client = jwksClient({
    jwksUri: jwksUri
});

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

// 驗證 ID Token 的中介軟件（通常用於前端應用）
const authenticateCookie = (req, res, next) => {
    const token = req.cookies.token; // 假設您將 ID Token 存儲在 idToken Cookie 中
    console.log(token);
    if (!token) {
        console.log("Cookie auth token missing.");
        return res.redirect("/login");
    }

    jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    }, (err, decoded) => {
        if (err) {
            console.error("JWT verification failed:", err);
            return res.redirect("/login");
        }
        console.log('Decoded JWT:', decoded['cognito:username']);
        console.log('Decoded JWT:', decoded.iss);

        req.user = decoded['cognito:username'] ; // 將用戶信息附加到請求對象
        const username = decoded['cognito:username'] 
        console.log(`authTokencook verified for user: ${username} at URL ${req.url}`);
        next();
    });
};

// 驗證 Access Token 的中介軟件（通常用於 API 調用）
const authenticateToken = (req, res, next) => {
    console.log("authenticating token...");
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("JSON web token missing.");
        return res.sendStatus(401); // 未授權
    }

    jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
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

module.exports = { authenticateCookie, authenticateToken };