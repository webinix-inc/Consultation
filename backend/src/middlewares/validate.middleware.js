const Joi = require("joi");
const httpStatus = require("../constants/httpStatus");

// Generic validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all validation errors
      allowUnknown: true, // Allow unknown fields
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req[property] = value; // ✅ Assign sanitized & validated input back to req
    next();
  };
};

// Validate request params (like :id)
const validateParams = (schema) => validate(schema, 'params');

// Validate query parameters
const validateQuery = (schema) => validate(schema, 'query');

module.exports = {
  validate,
  validateParams,
  validateQuery,
};
