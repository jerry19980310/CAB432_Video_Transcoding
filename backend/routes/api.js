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

  // 驗證輸入欄位
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
    // 使用 Cognito 的 SignUpCommand 註冊用戶
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    console.log("Cognito response:", response);

    //do mot have permission to add user to group
    // const addToGroupParams = {
    //   UserPoolId: process.env.COGNITO_USER_POOL_ID,
    //   Username: username,
    //   GroupName: 'user', // The group you want to assign the user to
    // };

    // const addToGroupCommand = new AdminAddUserToGroupCommand(addToGroupParams);
    // await cognitoClient.send(addToGroupCommand);
    // console.log(`User ${username} added to group 'user'.`);

    // 將使用者資料插入到 MySQL 資料庫
    const db = req.db; // 使用已附加到 req 的資料庫連接

    // 在將密碼存入資料庫之前，確保您不存儲明文密碼
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 使用 MySQL 的預處理語句插入用戶資料
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

    // 返回成功響應
    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: {
        user: response.UserSub, // Cognito User ID
      },
    });
  } catch (error) {
    // 處理特定的 Cognito 錯誤
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
    } else if (error.code === 'ER_DUP_ENTRY') { // MySQL 重複鍵錯誤
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });
    } else {
      // 通用錯誤處理
      console.error("Signup Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred during signup. Please try again later.",
      });
    }
  }
});


// router.post("/signup", async (req, res) => {
//   const { username, email, password } = req.body;

//   // Validate input fields
//   if (!username || !email || !password) {
//     return res
//       .status(400)
//       .json({ success: false, message: "All fields are required." });
//   }

//   const params = {
//     ClientId: CLIENT_ID,
//     Username: username,
//     Password: password,
//     UserAttributes: [
//       {
//         Name: "email",
//         Value: email,
//       }
//     ],
//   };

//   try {
//     const command = new SignUpCommand(params);
//     const response = await cognitoClient.send(command);
//     console.log(res);

//     // 如果需要自動確認使用者，可以在這裡呼叫 AdminConfirmSignUpCommand
//     // 但這需要使用具有管理權限的 AWS 憑證

//     // 將使用者資料插入到您的資料庫
//     const { db } = req; // 假設您使用中介軟體將 db 附加到 req

//     // 在將密碼存入資料庫之前，確保您不存儲明文密碼
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     db.run(
//       "INSERT INTO users (username, email, password, cognito_user_id) VALUES (?, ?, ?, ?)",
//       [username, email, hashedPassword, response.UserSub],
//       (err) => {
//         if (err) {
//           console.error("Error inserting user into the database:", err.message);
//           return res.status(500).json({
//             success: false,
//             message: "Error saving user to the database.",
//           });
//         }

//         return res.status(201).json({
//           success: true,
//           message: "User registered successfully. Please verify your email.",
//           data: {
//             user: response.UserSub, // Cognito User ID
//           },
//         });
//       }
//     );
//   } catch (error) {
//     // Handle specific Cognito errors
//     if (error.name === "UsernameExistsException") {
//       return res
//         .status(400)
//         .json({ success: false, message: "Username already exists." });
//     } else if (error.name === "InvalidPasswordException") {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Password does not meet the security requirements. Please choose a stronger password.",
//       });
//     } else if (error.name === "InvalidParameterException") {
//       return res
//         .status(400)
//         .json({ success: false, message: error.message });
//     } else {
//       // Generic error handler
//       console.error("Cognito Signup Error:", error);
//       return res.status(500).json({
//         success: false,
//         message: "An error occurred during signup. Please try again later.",
//       });
//     }
//   }
// });







module.exports = router;