const httpStatus = require("../constants/httpStatus");
const { sendError } = require("../utils/response");

// 404 Not Found middleware
const notFound = (req, res, next) => {
  return sendError(
    res,
    `Route ${req.originalUrl} not found`,
    null,
    httpStatus.NOT_FOUND
  );
};

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // Handle specific error types
  if (err.name === "ApiError") {
    return sendError(
      res,
      err.message,
      err.errors,
      err.statusCode || httpStatus.INTERNAL_SERVER_ERROR
    );
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    return sendError(
      res,
      "Validation failed",
      errors,
      httpStatus.BAD_REQUEST
    );
  }

  // Handle Mongoose duplicate key error (avoid exposing values in production)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const message = process.env.NODE_ENV === "production"
      ? "A record with this value already exists"
      : `${field.charAt(0).toUpperCase() + field.slice(1)} '${err.keyValue[field]}' already exists`;
    return sendError(res, message, null, httpStatus.CONFLICT);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(
      res,
      "Invalid ID format",
      null,
      httpStatus.BAD_REQUEST
    );
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(
      res,
      "Invalid token",
      null,
      httpStatus.UNAUTHORIZED
    );
  }

  if (err.name === "TokenExpiredError") {
    return sendError(
      res,
      "Token expired",
      null,
      httpStatus.UNAUTHORIZED
    );
  }

  // Default error response
  return sendError(
    res,
    process.env.NODE_ENV === "production" 
      ? "Something went wrong" 
      : err.message,
    process.env.NODE_ENV === "production" 
      ? null 
      : { stack: err.stack },
    httpStatus.INTERNAL_SERVER_ERROR
  );
};

module.exports = {
  notFound,
  errorHandler,
};