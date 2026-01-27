require("dotenv").config({ path: ".env" }); // Load env from current dir
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const run = async () => {
    console.log("🔹 Verifying S3 Credentials...");
    console.log("Region:", process.env.S3_REGION || process.env.AWS_REGION);
    console.log("Bucket:", process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME);
    console.log("Access Key ID:", (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").slice(0, 5) + "*****");

    const s3Client = new S3Client({
        region: process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1",
        credentials: {
            accessKeyId: (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim(),
            secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
        },
    });

    const testKey = `test-upload-${Date.now()}.txt`;
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME,
        Key: testKey,
        Body: "S3 Verification Test",
        ContentType: "text/plain",
        // ACL removed
    });

    try {
        console.log(`🔹 Attempting upload of ${testKey}...`);
        await s3Client.send(command);
        console.log("✅ Upload Successful!");
        console.log(`File should be at: https://${process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.S3_REGION || process.env.AWS_REGION}.amazonaws.com/${testKey}`);
    } catch (err) {
        console.error("❌ Upload Failed!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.name === 'InvalidAccessKeyId') {
            console.error("⚠️  Possible Cause: The Access Key ID is incorrect.");
        } else if (err.name === 'SignatureDoesNotMatch') {
            console.error("⚠️  Possible Cause: The Secret Access Key is incorrect.");
        }
    }
};

run();
