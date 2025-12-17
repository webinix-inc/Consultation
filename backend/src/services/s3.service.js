const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - Original file name
 * @param {String} folder - Folder path (e.g., "users/userId/images" or "users/userId/documents")
 * @param {String} mimeType - File MIME type
 * @returns {Promise<Object>} - { key, url }
 */
const uploadFile = async (fileBuffer, fileName, folder, mimeType) => {
  try {
    // Generate unique file name
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${uniqueFileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: "public-read", // Make files publicly accessible
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

    return {
      key,
      url,
      fileName: uniqueFileName,
      originalFileName: fileName,
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {String} key - S3 object key
 * @returns {Promise<Boolean>}
 */
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("S3 Delete Error:", error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Get presigned URL for private file access (valid for 1 hour)
 * @param {String} key - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<String>} - Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("S3 Presigned URL Error:", error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Extract S3 key from URL
 * @param {String} url - S3 file URL
 * @returns {String} - S3 key
 */
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    // Extract key from URL like: https://bucket-name.s3.region.amazonaws.com/folder/file.ext
    const match = url.match(/https?:\/\/[^\/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate folder path for user files
 * @param {String} userId - User ID
 * @param {String} type - File type: 'images' or 'documents'
 * @returns {String} - Folder path
 */
const getUserFolder = (userId, type = "images") => {
  return `users/${userId}/${type}`;
};

module.exports = {
  uploadFile,
  deleteFile,
  getPresignedUrl,
  extractKeyFromUrl,
  getUserFolder,
  s3Client,
};

