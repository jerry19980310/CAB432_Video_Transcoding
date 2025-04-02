import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const REGION = process.env.REGION;

const sqsClient = new SQSClient({ region: REGION });

export const handler = async (event) => {

    const queueUrl = process.env.SQS_QUEUE_URL;

    console.log("SQS_QUEUE_URL:", queueUrl);
    console.log("REGION:", REGION);
    
    const sendMessagePromises = event.Records.map(async (record) => {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        if (key.startsWith('logs/')) {
            console.log(`Ignoring log file: ${key}`);
            return;
        }
        
        const messageBody = JSON.stringify({
            bucket: bucket,
            key: key
        });
        
        const params = {
            QueueUrl: queueUrl,
            MessageBody: messageBody
        };
        
        try {
            const data = await sqsClient.send(new SendMessageCommand(params));
            console.log(`Message sent to SQS with MessageId: ${data.MessageId}`);
        } catch (error) {
            console.error(`Error sending message to SQS: ${error}`);
            throw error;
        }
    });
    
    try {
        await Promise.all(sendMessagePromises);
        return {
            statusCode: 200,
            body: JSON.stringify('Messages sent to SQS.')
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to send messages to SQS.')
        };
    }
};