
require("dotenv").config({ path: ".env" });
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const https = require("https");

const s3Client = new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
    },
});

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
const KEY = "public-access-test.txt";

const run = async () => {
    try {
        console.log("Uploading test file...");
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: KEY,
            Body: "Public Access Test",
            ContentType: "text/plain"
            // LCA removed
        }));

        const url = `https://${BUCKET_NAME}.s3.${process.env.S3_REGION || process.env.AWS_REGION}.amazonaws.com/${KEY}`;
        console.log(`Checking URL: ${url}`);

        https.get(url, (res) => {
            console.log(`HTTP Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log("✅ Public Access Working!");
            } else {
                console.log("❌ Public Access Failed (Likely 403 Forbidden).");
                console.log("This means the bucket blocks public access. A Bucket Policy is required.");
            }
        }).on('error', (e) => {
            console.error("Network Error:", e);
        });

    } catch (err) {
        console.error("Upload Error:", err);
    }
};

run();
