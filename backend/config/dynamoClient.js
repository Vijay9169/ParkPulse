const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

// Client configure karein
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fakeKey",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fakeSecret",
  }
});

const docClient = DynamoDBDocumentClient.from(client);

module.exports = { docClient };