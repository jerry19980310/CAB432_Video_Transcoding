SSM = require("@aws-sdk/client-ssm");

const client = new SSM.SSMClient({ region: "ap-southeast-2" });

const getAwsParameterAssessment2 = async () => {
   const parameter_name = "/n11428911/assessment2";
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
const getAwsParameterGoogleApiVideos = async () => {
   const parameter_name = "/n11428911/googleApiVideos";
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
const getAwsParameterGoogleApiSearch = async () => {
   const parameter_name = "/n11428911/googleApiSearch";
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

module.exports = { getAwsParameterAssessment2, getAwsParameterGoogleApiSearch, getAwsParameterGoogleApiVideos };