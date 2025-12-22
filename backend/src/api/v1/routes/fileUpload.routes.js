const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../../middlewares/auth.middleware");
const { uploadImage, uploadDocument, uploadToCloudinary, uploadMultipleToCloudinary } = require("../../../middlewares/upload.middleware");
const fileUploadController = require("../controllers/fileUpload.controller");

// Upload profile image
router.post("/image", authenticateToken, uploadImage.single("image"), uploadToCloudinary, fileUploadController.uploadImage);

// Upload document
router.post("/document", authenticateToken, uploadDocument.single("document"), uploadToCloudinary, fileUploadController.uploadDocument);

// Upload multiple files
router.post("/multiple", authenticateToken, uploadDocument.array("files", 10), uploadMultipleToCloudinary, fileUploadController.uploadMultiple);

// Delete file
router.delete("/", authenticateToken, fileUploadController.deleteFile);

module.exports = router;

