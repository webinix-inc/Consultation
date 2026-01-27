
require("dotenv").config({ path: ".env" });
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const http = require("http");

const s3Client = new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
    },
});

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
const KEY = "invoices/proxy-test.txt";

const run = async () => {
    try {
        console.log("1. Uploading test file to S3...");
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: KEY,
            Body: "Proxy Download Verification Successful!",
            ContentType: "text/plain"
        }));

        const proxyUrl = `http://localhost:5002/api/v1/storage/proxy?key=${KEY}`;
        console.log(`2. Attempting download via Proxy: ${proxyUrl}`);

        http.get(proxyUrl, (res) => {
            console.log(`HTTP Status: ${res.statusCode}`);

            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log("3. Response Data:", data);
                    if (data === "Proxy Download Verification Successful!") {
                        console.log("✅ Proxy Verification PASSED!");
                    } else {
                        console.log("❌ Content Mismatch.");
                    }
                });
            } else {
                console.log("❌ Request Failed.");
                // Consume response to free memory
                res.resume();
            }
        }).on('error', (e) => {
            console.error("Network Error:", e);
            console.log("⚠️  Ensure the backend server is running on port 5002.");
        });

    } catch (err) {
        console.error("Setup Error:", err);
    }
};

run();
