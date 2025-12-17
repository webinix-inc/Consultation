const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const { uploadFile, deleteFile, getUserFolder } = require("../../../services/s3.service");

/**
 * Upload profile image
 * POST /api/v1/upload/image
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError("No file uploaded", httpStatus.BAD_REQUEST);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError("User not authenticated", httpStatus.UNAUTHORIZED);
    }

    // File is already uploaded to S3 by multer middleware
    const fileUrl = req.file.location;
    const fileKey = req.file.key;

    return sendSuccess(res, "Image uploaded successfully", {
      url: fileUrl,
      key: fileKey,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload document
 * POST /api/v1/upload/document
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError("No file uploaded", httpStatus.BAD_REQUEST);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError("User not authenticated", httpStatus.UNAUTHORIZED);
    }

    // File is already uploaded to S3 by multer middleware
    const fileUrl = req.file.location;
    const fileKey = req.file.key;

    return sendSuccess(res, "Document uploaded successfully", {
      url: fileUrl,
      key: fileKey,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete file from S3
 * DELETE /api/v1/upload/:key
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const { key } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError("User not authenticated", httpStatus.UNAUTHORIZED);
    }

    if (!key) {
      throw new ApiError("File key is required", httpStatus.BAD_REQUEST);
    }

    // Verify the file belongs to the user (security check)
    if (!key.includes(`users/${userId}/`)) {
      throw new ApiError("Unauthorized to delete this file", httpStatus.FORBIDDEN);
    }

    await deleteFile(key);

    return sendSuccess(res, "File deleted successfully", { key });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple files
 * POST /api/v1/upload/multiple
 */
exports.uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ApiError("No files uploaded", httpStatus.BAD_REQUEST);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError("User not authenticated", httpStatus.UNAUTHORIZED);
    }

    const uploadedFiles = req.files.map((file) => ({
      url: file.location,
      key: file.key,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }));

    return sendSuccess(res, "Files uploaded successfully", {
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    next(error);
  }
};

