SecretsManager = require("@aws-sdk/client-secrets-manager");

const secret_name = "n11428911-backend";
const client = new SecretsManager.SecretsManagerClient({ region: "ap-southeast-2" });

const getAwsSecret = async () => {
   try {
      const response = await client.send(
         new SecretsManager.GetSecretValueCommand({
            SecretId: secret_name
         })
      );
      const secret = response.SecretString;
      return JSON.parse(secret);
   } catch (error) {
      console.log(error);
   }
}

module.exports = { getAwsSecret };