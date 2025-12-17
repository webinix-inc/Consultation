const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const { createUserSchema, updateUserSchema, userIdSchema } = require("../validators/user.validator.js");

// GET /api/v1/users - Admin, Employee and Consultant only
router.get("/", userController.getUsers);
// router.get("/", authenticateToken, authorizeRoles("Admin", "Employee", "Consultant"), userController.getUsers);

// GET /api/v1/users/profile - Get current user profile
router.get("/profile", authenticateToken, userController.getProfile);


// GET /api/v1/users/consultants/active - For Client role to get active consultants
router.get("/consultants/active", authenticateToken, authorizeRoles("Admin", "Employee", "Consultant", "Client"), userController.getActiveConsultants);


// POST /api/v1/users - Admin and Employee only
router.post("/",  userController.createUser);
// router.post("/", authenticateToken, authorizeRoles("Admin", "Employee", "Consultant"), validate(createUserSchema), userController.createUser);


// PATCH /api/v1/users/:id - Admin and Employee only
router.patch("/:id", authenticateToken, authorizeRoles("Admin", "Employee", "Consultant"), validateParams(userIdSchema), validate(updateUserSchema), userController.updateUser);

// DELETE /api/v1/users/:id - Admin and Employee only
router.delete("/:id", userController.deleteUser);
// router.delete("/:id", authenticateToken, authorizeRoles("Admin", "Employee", "Consultant"), validateParams(userIdSchema), userController.deleteUser);

module.exports = router;