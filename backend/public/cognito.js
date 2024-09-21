// config/aws.js
const { CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");

// Initialize the Cognito Identity Provider Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION // e.g., 'us-east-1'
});

module.exports = cognitoClient;