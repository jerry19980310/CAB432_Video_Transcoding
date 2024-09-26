const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const auth = require("../auth.js");
const { getAwsSecret }= require('../public/awsSecret.js');
const { SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const initializeCognitoClient = require("../public/cognito");


const saltRounds = 10; // Salt rounds for hashing passwords

router.post("/signup", async (req, res) => {
  const secrets = await getAwsSecret();
  const { username, email, password } = req.body;
  const cognitoClient = await initializeCognitoClient();

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const params = {
    ClientId: secrets.COGNITO_CLIENT_ID,
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
    // use Cognito SDK to sign up user
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);

    const db = req.db; 

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (username, email, password, cognito_user_id)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      username,
      email,
      hashedPassword,
      response.UserSub, // Cognito User ID
    ]);

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: {
        user: response.UserSub, // Cognito User ID
      },
    });
  } catch (error) {
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
    } else if (error.code === 'ER_DUP_ENTRY') { 
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });
    } else {
      console.error("Signup Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred during signup. Please try again later.",
      });
    }
  }
});







module.exports = router;