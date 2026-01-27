const Joi = require("joi");

const phoneSchema = Joi.string()
    .pattern(/^\+?[0-9]{7,15}$/)
    .messages({
        "string.pattern.base": "Mobile number must be valid (7-15 digits, optional + prefix)",
        "string.empty": "Mobile number cannot be empty",
    });

const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    "string.pattern.base": "Invalid ID format"
});

module.exports = {
    phoneSchema,
    objectIdSchema
};
