require('dotenv').config();
const { S3Client, ListBucketsCommand, GetBucketLocationCommand } = require("@aws-sdk/client-s3");

async function listBuckets() {
    console.log("Listing Buckets...");
    const s3 = new S3Client({
        region: "us-east-1", // ListBuckets works best from global endpoint
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    try {
        const data = await s3.send(new ListBucketsCommand({}));
        console.log("Owner:", data.Owner?.DisplayName);
        console.log("Buckets found:", data.Buckets?.length);

        for (const bucket of data.Buckets || []) {
            console.log(`- ${bucket.Name}`);
        }
    } catch (err) {
        console.error("❌ ListBuckets Failed!");
        console.error("Code:", err.name || err.code);
        console.error("Message:", err.message);
    }
}

listBuckets();
