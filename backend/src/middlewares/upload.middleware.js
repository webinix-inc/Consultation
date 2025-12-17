const multer = require("multer");
const { uploadFile, getUserFolder } = require("../services/s3.service");

/**
 * Multer memory storage (files stored in memory before uploading to S3)
 */
const memoryStorage = multer.memoryStorage();

/**
 * Multer configuration for file uploads
 * @param {String} folderType - 'images' or 'documents'
 * @returns {Object} - Multer instance
 */
const createUploadMiddleware = (folderType = "images") => {
  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: folderType === "images" ? 5 * 1024 * 1024 : 10 * 1024 * 1024, // 5MB for images, 10MB for documents
    },
    fileFilter: function (req, file, cb) {
      if (folderType === "images") {
        // Allow only image files
        const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."), false);
        }
      } else {
        // Allow documents (PDF, DOC, DOCX, etc.)
        const allowedMimes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "image/jpeg",
          "image/jpg",
          "image/png",
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid file type. Only PDF, DOC, DOCX, TXT, and image files are allowed."), false);
        }
      }
    },
  });
};

/**
 * Middleware to upload file to S3 after multer processes it
 */
const uploadToS3 = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const userId = req.user?.id || "anonymous";
    const folder = getUserFolder(userId, req.file.fieldname === "image" || req.file.fieldname === "avatar" ? "images" : "documents");
    
    // Upload file to S3
    const result = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder,
      req.file.mimetype
    );

    // Attach S3 file info to req.file
    req.file.location = result.url;
    req.file.key = result.key;
    req.file.s3FileName = result.fileName;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to upload multiple files to S3
 */
const uploadMultipleToS3 = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const userId = req.user?.id || "anonymous";
    const folderType = req.files[0].fieldname === "images" ? "images" : "documents";
    const folder = getUserFolder(userId, folderType);

    // Upload all files to S3
    const uploadPromises = req.files.map(async (file) => {
      const result = await uploadFile(
        file.buffer,
        file.originalname,
        folder,
        file.mimetype
      );
      
      file.location = result.url;
      file.key = result.key;
      file.s3FileName = result.fileName;
      
      return file;
    });

    await Promise.all(uploadPromises);
    next();
  } catch (error) {
    next(error);
  }
};

// Pre-configured middlewares
const uploadImage = createUploadMiddleware("images");
const uploadDocument = createUploadMiddleware("documents");

module.exports = {
  uploadImage,
  uploadDocument,
  uploadToS3,
  uploadMultipleToS3,
  createUploadMiddleware,
};

