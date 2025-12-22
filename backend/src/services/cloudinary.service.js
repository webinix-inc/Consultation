const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Folder path (e.g., "users/avatars", "categories")
 * @returns {Promise<Object>} - { url, public_id }
 */
const uploadFile = async (fileBuffer, folder = "general") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto",
                use_filename: true, // Preserve original filename
                unique_filename: true, // Add unique identifier to avoid conflicts
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return reject(new Error("Failed to upload file to Cloudinary"));
                }
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format,
                    width: result.width,
                    height: result.height,
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Boolean>}
 */
const deleteFile = async (publicId) => {
    try {
        if (!publicId) return false;

        // Extract public_id if a full URL is provided (basic extraction)
        if (publicId.startsWith("http")) {
            // This is a naive extraction and might need adjustment based on folder structure
            // A safer way is to store public_id in DB, but if only URL is stored:
            const parts = publicId.split('/');
            const filename = parts.pop();
            const id = filename.split('.')[0];
            // This assumes no nested folders in the URL path relative to cloud root, which is often wrong.
            // It's better to expect the actual public_id passed to this function.
            // We'll assume the caller passes the public_id or we don't delete.
            console.warn("deleteFile expected public_id, got URL. Skipping delete to avoid errors.");
            return false;
        }

        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
        throw new Error("Failed to delete image from Cloudinary");
    }
};

/**
 * Generate a signed URL for secure file access
 * This bypasses the 401 authentication issues by creating temporary public URLs
 * @param {String} publicId - Cloudinary public ID of the file
 * @param {Object} options - Transformation options
 * @returns {String} - Signed URL
 */
const getSignedUrl = (publicId, options = {}) => {
    try {
        // Determine resource type from public_id or use raw for documents
        const resourceType = options.resource_type || 'raw';

        // Default options for file access
        const urlOptions = {
            resource_type: resourceType,
            type: 'upload',
            sign_url: true,
            secure: true,
            ...options
        };

        // Generate signed URL
        const signedUrl = cloudinary.url(publicId, urlOptions);
        return signedUrl;
    } catch (error) {
        console.error("Error generating signed URL:", error);
        throw new Error("Failed to generate signed URL");
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    getSignedUrl,
    cloudinary,
};
