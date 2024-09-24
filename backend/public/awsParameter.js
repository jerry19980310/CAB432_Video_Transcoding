SSM = require("@aws-sdk/client-ssm");
const parameter_name = "/n11428911/assessment2";
const client = new SSM.SSMClient({ region: "ap-southeast-2" });

const getAwsParameter = async () => {
   try {
      response = await client.send(
         new SSM.GetParameterCommand({
            Name: parameter_name
         })
      );
    //   console.log(response.Parameter.Value);

      return response.Parameter.Value;

      console.log(response.Parameter.Value);
   } catch (error) {
      console.log(error);
   }
}

module.exports = { getAwsParameter };