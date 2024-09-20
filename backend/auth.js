// const jwt = require("jsonwebtoken");

// Simple hard-coded username and password for demonstration
// const users = {
//    jerry: {
//       password: "123456",
//       admin: false,
//    },
//    test: {
//       password: "1234",
//       admin: false,
//    },
//    admin: {
//       password: "admin",
//       admin: true,
//    },
// };

// // Using a fixed authentication secret for demonstration purposes.
// // Ideally this would be stored in a secrets manager and retrieved here.
// // To create a new randomly chosen secret instead, you can use:
// //
// // tokenSecret = require("crypto").randomBytes(64).toString("hex");
// //
// const tokenSecret = require("crypto").randomBytes(64).toString("hex");

// // Create a token with username embedded, setting the validity period.
// const generateAccessToken = (username, password) => {
//    // Check the username and password
//    console.log("Login attempt", username, password);
//    const user = users[username];

//    if (!user || password !== user.password) {
//       console.log("Unsuccessful login by user", username);
//       return false;
//    }

//    const userData = { 
//       username: username,
//       admin: user.admin
//    };

//    // Get a new authentication token and send it back to the client
//    console.log("Successful login by user", username);

//    return jwt.sign(userData, tokenSecret, { expiresIn: "30m" });
// };

// const authenticateCookie = (req, res, next) => {
//    // Check to see if the cookie has a token
//    token = req.cookies.token;

//    if (!token) {
//       console.log("Cookie auth token missing.");
//       return res.redirect("/login");
//    }

//    // Check that the token is valid
//    try {
//       const user = jwt.verify(token, tokenSecret);

//       console.log(
//          `Cookie token verified for user: ${user.username} at URL ${req.url}`
//       );

//       // Add user info to the request for the next handler
//       req.user = user;
//       next();
//    } catch (err) {
//       console.log(
//          `JWT verification failed at URL ${req.url}`,
//          err.name,
//          err.message
//       );
//       return res.redirect("/login");
//    }
// };

// // Middleware to verify a token and respond with user information
// const authenticateToken = (req, res, next) => {
//    // Assume we are using Bearer auth.  The token is in the authorization header.
//    const authHeader = req.headers["authorization"];
//    const token = authHeader && authHeader.split(" ")[1];

//    console.log(token);

//    if (!token) {
//       console.log("JSON web token missing.");
//       return res.sendStatus(401);
//    }

//    // Check that the token is valid
//    try {
//       const user = jwt.verify(token, tokenSecret);

//       console.log(
//          `authToken verified for user: ${user.username} at URL ${req.url}`
//       );

//       // Add user info to the request for the next handler
//       req.user = user;
//       next();
//    } catch (err) {
//       console.log(
//          `JWT verification failed at URL ${req.url}`,
//          err.name,
//          err.message
//       );
//       return res.sendStatus(401);
//    }
// };

// module.exports = { generateAccessToken, authenticateCookie, authenticateToken };
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require('dotenv').config();

// JWT secret from environment variables
const tokenSecret = process.env.JWT_SECRET;

// Create a token with username embedded, setting the validity period.
const generateAccessToken = (username) => {
    const userData = { username: username };

    // Return JWT token
    return jwt.sign(userData, tokenSecret, { expiresIn: "30m" });
};

const authenticateCookie = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.redirect("/login");

    // Verify token
    try {
        const user = jwt.verify(token, tokenSecret);
        req.user = user; // Attach user to request
        console.log(`authTokencook verified for user: ${user.username} at URL ${req.url}`);
        res.json(user.username);
        next();
    } catch (err) {
        return res.redirect("/login");
    }
};

// Middleware to verify token (used for API calls)
const authenticateToken = (req, res, next) => {
    console.log("Authenticating token");
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    try {
        const user = jwt.verify(token, tokenSecret);
        req.user = user;
        console.log(`authToken verified for user: ${user.username} at URL ${req.url}`);
        next();
    } catch (err) {
        return res.sendStatus(403);
    }
};

module.exports = { generateAccessToken, authenticateCookie, authenticateToken };