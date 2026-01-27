
require("dotenv").config({ path: ".env" });
const { S3Client, PutBucketPolicyCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
    },
});

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;

const run = async () => {
    try {
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadForInvoices",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::${BUCKET_NAME}/*` // Allowing all for now to match legacy behavior, or narrow to invoices/
                }
            ]
        };

        // Note: Narrowing to just invoices/ would be:
        // Resource: `arn:aws:s3:::${BUCKET_NAME}/invoices/*`
        // But the previous code allowed everything public. Let's try to be permissive first to ensure it works, 
        // OR better: Just invoices/ if that's where we store them. 
        // Be safer: `invoices/*` and also `users/*` if those were public. 
        // The user's app seems to have `users/` and `invoices/`.
        // Let's use `*` for the resource path to avoid breaking other public assets if any.

        console.log(`Setting Bucket Policy for ${BUCKET_NAME}...`);

        const command = new PutBucketPolicyCommand({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(policy)
        });

        await s3Client.send(command);
        console.log("✅ Bucket Policy Updated Successfully!");
    } catch (err) {
        console.error("❌ Failed to set Bucket Policy:", err.message);
        if (err.name === 'AccessDenied') {
            console.error("Reason: Your IAM user does not have 's3:PutBucketPolicy' permission.");
        }
    }
};

run();
