// const express = require("express");
// const router = express.Router();
// const auth = require("../auth.js");

// // User needs to login to obtain an authentication token  
// //for other application such as mobile
// router.post("/login", (req, res) => {
//    const { username, password } = req.body;
//    const token = auth.generateAccessToken(username, password);
//    if (!token) {
//       res.sendStatus(403);
//    }
//    res.json({ authToken: token });
//    console.log("test");
// });

// router.get("/data", auth.authenticateToken, (req, res) => {
//    if (!req.user.username) {
//       // bad user
//       console.log("Unauthorised request.");
//       return res.sendStatus(403);
//    }

//    res.json({ data: "some data intended only for logged-in users."});
// });

// router.get("/adminData", auth.authenticateToken, (req, res) => {
//    if (!req.user.username || !req.user.admin) {
//       // bad user
//       console.log("Unauthorised request.");
//       return res.sendStatus(403);
//    }

//    res.json({ data: "some data intended only for admin users."});
// });

// // Route to get all videos with uploadPath
// router.get('/videos/:username', auth.authenticateToken, (req, res) => {
//    req.db.all("SELECT id, filename, uploadPath FROM videos where userName=?", [req.user.username], (err, rows) => {
//        if (err) {
//            res.status(500).send("Error fetching videos from database: " + err.message);
//            return;
//        }

//        const videos = rows.map(row => ({
//            id: row.id,
//            fileName: row.fileName,
//            uploadPath: row.uploadPath
//        }));
//        res.json(videos);
//    });
// });

// // Route for transcoding video
// router.post('/transcode/:id', auth.authenticateToken, (req, res) => {
//    const id = req.params.id;
//    req.db.get(`SELECT filename FROM videos WHERE id=?`, [id], (err, row) => {
//        if (err) {
//            res.status(500).send(err.message);
//        } else if (row) {
//            const outputPath = row.filename.replace('.mp4', '-converted.mp4');
           
//            // Transcode video
//            ffmpeg(row.filename)
//                .output(outputPath)
//                .outputOptions('-c:v libx264') // example option
//                .toFormat('mp4')
//                .on('end', () => {
//                    console.log('File has been converted.');
//                    res.send(`File converted and saved at ${outputPath}`);
//                })
//                .on('error', (err) => {
//                    console.error('Error during conversion:', err);
//                    res.status(500).send('Error during conversion');
//                })
//                .run();
//        } else {
//            res.status(404).send('Original file not found');
//        }
//    });
// });

// // Route to download video
// router.get('/download/:id', auth.authenticateToken, (req, res) => {
//    const id = req.params.id;
//    req.db.get(`SELECT filename FROM videos WHERE id=?`, [id], (err, row) => {
//        if (err) {
//            res.status(500).send(err.message);
//        } else if (row) {
//            res.download(row.filename);
//        } else {
//            res.status(404).send('File not found');
//        }
//    });
// });

// module.exports = router;
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const auth = require("../auth.js");

const saltRounds = 10; // Salt rounds for hashing passwords

// Sign-up route
router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // Check if user already exists in the database
  req.db.get("SELECT * FROM users WHERE username = ? OR email = ?", [username, email], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error: " + err.message });
    }

    if (row) {
      // User already exists
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password before saving
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Error hashing password: " + err.message });
      }

      // Insert new user into the database
      req.db.run(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hash],
        (err) => {
          if (err) {
            console.log(err.message);
            return res.status(500).json({ success: false, message: "Error inserting user into the database: " + err.message });
          }
          res.status(201).json({ success: true, message: "User registered successfully" });
        }
      );
    });
  });
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