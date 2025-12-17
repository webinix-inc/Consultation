const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../../middlewares/auth.middleware");
const { uploadImage, uploadDocument, uploadToS3, uploadMultipleToS3 } = require("../../../middlewares/upload.middleware");
const fileUploadController = require("../controllers/fileUpload.controller");

// Upload profile image
router.post("/image", authenticateToken, uploadImage.single("image"), uploadToS3, fileUploadController.uploadImage);

// Upload document
router.post("/document", authenticateToken, uploadDocument.single("document"), uploadToS3, fileUploadController.uploadDocument);

// Upload multiple files
router.post("/multiple", authenticateToken, uploadDocument.array("files", 10), uploadMultipleToS3, fileUploadController.uploadMultiple);

// Delete file
router.delete("/:key", authenticateToken, fileUploadController.deleteFile);

module.exports = router;

