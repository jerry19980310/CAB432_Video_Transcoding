const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
require('dotenv').config();
const { getAwsSecret } = require('./public/awsSecret.js');

let client;
let jwksUri;
let secret;

// get the key for the JWT
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

// initialize the auth configuration
const initializeAuth = async () => {
    try {
        const secret = await getAwsSecret(); //get the secret from AWS Secrets Manager

        const userPoolId = secret.COGNITO_USER_POOL_ID;
        const region = secret.AWS_REGION;

        // Initialize the JWKS client
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

// authenticate the cookie
const authenticateCookie = async (req, res, next) => {
    const token = req.cookies.token; 
    const secret = await getAwsSecret(); 

    if (!token) {
        console.log("Cookie auth token missing.");
        return res.redirect("/login");
    }

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

// authenticate the token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("JSON web token missing.");
        return res.sendStatus(401); 
    }

    await initializeAuth();

    jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${secret.AWS_REGION}.amazonaws.com/${secret.COGNITO_USER_POOL_ID}`,
    }, (err, decoded) => {
        if (err) {
            console.error("JWT verification failed:", err);
            return res.sendStatus(403);
        }

        req.user = decoded; 
        console.log(`authToken verified for user: ${decoded.username} at URL ${req.url}`);
        next();
    });
};

module.exports = { initializeAuth, authenticateCookie, authenticateToken };