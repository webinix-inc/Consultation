const { Document } = require("../../../models/document.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const { deleteFile, extractKeyFromUrl } = require("../../../services/s3.service");
const { getSignedUrl } = require("../../../services/cloudinary.service");

/**
 * Get all documents with filters
 * GET /api/v1/documents
 */
exports.getAll = async (req, res, next) => {
  try {
    const { client, consultant, appointment, type, status, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Build filter
    const filter = { status: { $ne: "Deleted" } };

    // Role-based filtering
    if (userRole === "Client") {
      filter.client = userId;
    } else if (userRole === "Consultant") {
      filter.consultant = userId;
    }

    // Additional filters
    if (client) filter.client = client;
    if (consultant) filter.consultant = consultant;
    if (appointment) filter.appointment = appointment;
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const documents = await Document.find(filter)
      .populate("client", "fullName email")
      .populate("consultant", "name displayName firstName lastName email")
      .populate("appointment", "date startTime endTime")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    // Generate signed URLs for document access
    const documentsWithSignedUrls = documents.map(doc => {
      const docObj = doc.toObject();

      // Extract public_id from fileKey and determine resource type from fileUrl
      if (docObj.fileKey && docObj.fileUrl) {
        try {
          // Detect resource type from original URL
          let resourceType = 'raw'; // default
          if (docObj.fileUrl.includes('/image/upload/')) {
            resourceType = 'image';
          } else if (docObj.fileUrl.includes('/raw/upload/')) {
            resourceType = 'raw';
          } else if (docObj.fileUrl.includes('/video/upload/')) {
            resourceType = 'video';
          }

          docObj.fileUrl = getSignedUrl(docObj.fileKey, { resource_type: resourceType });
        } catch (error) {
          console.error("Error generating signed URL for document:", docObj._id, error);
        }
      }

      return docObj;
    });

    return sendSuccess(res, "Documents fetched successfully", {
      documents: documentsWithSignedUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document
 * GET /api/v1/documents/:id
 */
exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const document = await Document.findById(id)
      .populate("client", "fullName email")
      .populate("consultant", "name displayName firstName lastName email")
      .populate("appointment", "date startTime endTime");

    if (!document) {
      throw new ApiError("Document not found", httpStatus.NOT_FOUND);
    }

    // Authorization check
    if (userRole === "Client" && document.client.toString() !== userId) {
      throw new ApiError("Unauthorized to access this document", httpStatus.FORBIDDEN);
    }
    if (userRole === "Consultant" && document.consultant.toString() !== userId) {
      throw new ApiError("Unauthorized to access this document", httpStatus.FORBIDDEN);
    }

    return sendSuccess(res, "Document fetched successfully", document);
  } catch (error) {
    next(error);
  }
};

/**
 * Create document (after file upload)
 * POST /api/v1/documents
 */
exports.create = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { title, type, client, consultant, appointment, description, fileUrl, fileKey, fileName, originalFileName, fileSize, mimeType } = req.body;

    // Validate required fields
    if (!title || !type || !fileUrl || !fileKey) {
      throw new ApiError("Missing required fields: title, type, fileUrl, fileKey", httpStatus.BAD_REQUEST);
    }

    // Determine client and consultant based on role
    let finalClient = client;
    let finalConsultant = consultant;

    if (req.user?.role === "Client") {
      finalClient = userId;
      if (!finalConsultant) {
        throw new ApiError("Consultant is required", httpStatus.BAD_REQUEST);
      }
    } else if (req.user?.role === "Consultant") {
      finalConsultant = userId;
      if (!finalClient) {
        throw new ApiError("Client is required", httpStatus.BAD_REQUEST);
      }
    }

    const document = await Document.create({
      title,
      type,
      client: finalClient,
      consultant: finalConsultant,
      appointment: appointment || null,
      fileUrl,
      fileKey,
      fileName: fileName || originalFileName,
      originalFileName: originalFileName || fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || "application/octet-stream",
      uploadedBy: userId,
      description: description || "",
    });

    const populatedDoc = await Document.findById(document._id)
      .populate("client", "fullName email")
      .populate("consultant", "name displayName firstName lastName email");

    return sendSuccess(res, "Document created successfully", populatedDoc, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Update document
 * PATCH /api/v1/documents/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title, type, description, status } = req.body;

    const document = await Document.findById(id);

    if (!document) {
      throw new ApiError("Document not found", httpStatus.NOT_FOUND);
    }

    // Authorization check
    if (document.uploadedBy.toString() !== userId && req.user?.role !== "Admin") {
      throw new ApiError("Unauthorized to update this document", httpStatus.FORBIDDEN);
    }

    // Update allowed fields
    if (title) document.title = title;
    if (type) document.type = type;
    if (description !== undefined) document.description = description;
    if (status) document.status = status;

    await document.save();

    const updatedDoc = await Document.findById(id)
      .populate("client", "fullName email")
      .populate("consultant", "name displayName firstName lastName email");

    return sendSuccess(res, "Document updated successfully", updatedDoc);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document
 * DELETE /api/v1/documents/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      throw new ApiError("Document not found", httpStatus.NOT_FOUND);
    }

    // Authorization check
    if (document.uploadedBy.toString() !== userId && req.user?.role !== "Admin") {
      throw new ApiError("Unauthorized to delete this document", httpStatus.FORBIDDEN);
    }

    // Delete file from S3
    try {
      if (document.fileKey) {
        await deleteFile(document.fileKey);
      } else if (document.fileUrl) {
        // Try to extract key from URL if key is not stored
        const key = extractKeyFromUrl(document.fileUrl);
        if (key) {
          await deleteFile(key);
        }
      }
    } catch (s3Error) {
      console.error("Error deleting file from S3:", s3Error);
      // Continue with document deletion even if S3 deletion fails
    }

    // Delete document from database
    await Document.findByIdAndDelete(id);

    return sendSuccess(res, "Document deleted successfully", { deletedId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Get document types
 * GET /api/v1/documents/types
 */
exports.getTypes = async (req, res, next) => {
  try {
    const types = [
      "Medical Report",
      "Consultation Notes",
      "Prescription",
      "Invoice",
      "Lab Results",
      "Treatment Plan",
      "Other",
    ];

    return sendSuccess(res, "Document types fetched successfully", { types });
  } catch (error) {
    next(error);
  }
};

