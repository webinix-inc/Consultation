const httpStatus = require("../constants/httpStatus");

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, message = "Success", data = null, statusCode = httpStatus.OK) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} errors - Error details
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, message = "Something went wrong", errors = null, statusCode = httpStatus.INTERNAL_SERVER_ERROR) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const sendPaginatedResponse = (res, data, pagination, message = "Success") => {
  return res.status(httpStatus.OK).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
  });
};

/**
 * Create API error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Error details
 */
class ApiError extends Error {
  constructor(message, statusCode = httpStatus.INTERNAL_SERVER_ERROR, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }
}

module.exports = {
  sendSuccess,
  sendError,
  sendPaginatedResponse,
  ApiError,
};
