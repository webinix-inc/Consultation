require('dotenv').config();

async function checkEnv() {
    console.log("Checking Environment Variables...");
    const key = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;

    if (!key) {
        console.log("❌ No S3 Access Key found in environment!");
    } else {
        const masked = key.substring(0, 4) + "..." + key.substring(key.length - 4);
        console.log("✅ S3 Access Key Loaded:", masked);
        console.log("Length:", key.length);
        console.log("First char code:", key.charCodeAt(0)); // Check for hidden BOM or whitespace
    }

    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
    console.log("Bucket:", bucket);
}

checkEnv();
