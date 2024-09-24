const Cognito = require("@aws-sdk/client-cognito-identity-provider");

const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const auth = require("../auth.js");
const { SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const cognitoClient = require("../public/cognito"); // Path to your AWS config
const jwt = require("jsonwebtoken");

const CLIENT_ID = process.env.COGNITO_CLIENT_ID; // Your Cognito App Client ID

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const saltRounds = 10; // Salt rounds for hashing passwords


router.post('/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Get user info from the payload
    const { sub, email, name } = payload;
    const googleUserId = sub;

    // Now, check if the user exists in your database
    const { db } = req; // Assuming db is attached to req
    db.get('SELECT * FROM users WHERE google_user_id = ?', [googleUserId], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (user) {
        // User exists, generate a JWT token
        const jwtPayload = { username: user.username, email: user.email, id: user.id };
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({
          success: true,
          data: {
            idToken: token,
            username: name,
          },
        });
      } else {
        // User does not exist, create a new user
        db.run(
          'INSERT INTO users (username, email, google_user_id) VALUES (?, ?, ?)',
          [name, email, googleUserId],
          function (err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            const userId = this.lastID;
            const jwtPayload = { username: name, email: email, id: userId };
            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.json({ success: true, token, username: name });
          }
        );
      }
    });
  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    return res.status(401).json({ success: false, message: 'Invalid Google ID token' });
  }
});


router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input fields
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      }
    ],
  };

  try {
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    console.log(res);

    // 如果需要自動確認使用者，可以在這裡呼叫 AdminConfirmSignUpCommand
    // 但這需要使用具有管理權限的 AWS 憑證

    // 將使用者資料插入到您的資料庫
    const { db } = req; // 假設您使用中介軟體將 db 附加到 req

    // 在將密碼存入資料庫之前，確保您不存儲明文密碼
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    db.run(
      "INSERT INTO users (username, email, password, cognito_user_id) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, response.UserSub],
      (err) => {
        if (err) {
          console.error("Error inserting user into the database:", err.message);
          return res.status(500).json({
            success: false,
            message: "Error saving user to the database.",
          });
        }

        return res.status(201).json({
          success: true,
          message: "User registered successfully. Please verify your email.",
          data: {
            user: response.UserSub, // Cognito User ID
          },
        });
      }
    );
  } catch (error) {
    // Handle specific Cognito errors
    if (error.name === "UsernameExistsException") {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists." });
    } else if (error.name === "InvalidPasswordException") {
      return res.status(400).json({
        success: false,
        message:
          "Password does not meet the security requirements. Please choose a stronger password.",
      });
    } else if (error.name === "InvalidParameterException") {
      return res
        .status(400)
        .json({ success: false, message: error.message });
    } else {
      // Generic error handler
      console.error("Cognito Signup Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred during signup. Please try again later.",
      });
    }
  }
});

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Fetch the user from the database
  req.db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error: " + err.message });
    }

    if (!row) {
      // User does not exist
      return res.status(403).json({ success: false, message: "Invalid credentials" });
    }

    // Compare hashed password
    bcrypt.compare(password, row.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Error comparing passwords: " + err.message });
      }

      if (!isMatch) {
        return res.status(403).json({ success: false, message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = auth.generateAccessToken(username);
      res.json({ success: true, authToken: token });
    });
  });
});

// Route to get all videos with uploadPath
router.get('/videos/:username', auth.authenticateToken, (req, res) => {
   req.db.all("SELECT id, filename, uploadPath FROM videos WHERE userName=?", [req.user.username], (err, rows) => {
       if (err) {
           res.status(500).send("Error fetching videos from database: " + err.message);
           return;
       }

       const videos = rows.map(row => ({
           id: row.id,
           fileName: row.fileName,
           uploadPath: row.uploadPath
       }));
       res.json(videos);
   });
});

// Route for transcoding video
router.post('/transcode/:id', auth.authenticateToken, (req, res) => {
   const id = req.params.id;
   req.db.get(`SELECT filename FROM videos WHERE id=?`, [id], (err, row) => {
       if (err) {
           res.status(500).send(err.message);
       } else if (row) {
           const outputPath = row.filename.replace('.mp4', '-converted.mp4');
           
           // Transcode video
           ffmpeg(row.filename)
               .output(outputPath)
               .outputOptions('-c:v libx264') // example option
               .toFormat('mp4')
               .on('end', () => {
                   console.log('File has been converted.');
                   res.send(`File converted and saved at ${outputPath}`);
               })
               .on('error', (err) => {
                   console.error('Error during conversion:', err);
                   res.status(500).send('Error during conversion');
               })
               .run();
       } else {
           res.status(404).send('Original file not found');
       }
   });
});

// Route to download video
router.get('/download/:id', auth.authenticateToken, (req, res) => {
   const id = req.params.id;
   req.db.get(`SELECT filename FROM videos WHERE id=?`, [id], (err, row) => {
       if (err) {
           res.status(500).send(err.message);
       } else if (row) {
           res.download(row.filename);
       } else {
           res.status(404).send('File not found');
       }
   });
});


module.exports = router;