// config/aws.js
const { CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");
const { getAwsSecret } = require('./awsSecret.js');

const initializeCognitoClient = async () => {
  try {
    const awsSecret = await getAwsSecret();
    const region = awsSecret.AWS_REGION || 'ap-southeast-2'; // Default region if not specified

    // Initialize the Cognito Identity Provider Client
    const cognitoClient = new CognitoIdentityProviderClient({
      region: region
    });

    return cognitoClient;
  } catch (error) {
    console.error('Error initializing Cognito client:', error);
    throw error;
  }
};

module.exports = initializeCognitoClient