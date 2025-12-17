const express = require("express");
const router = express.Router();
const controller = require("../controllers/location.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware.js");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all states
router.get("/states", controller.getStates);

// Get all cities (optionally filtered by state)
router.get("/cities", controller.getCities);

// Search states (for autocomplete)
router.get("/states/search", controller.searchStates);

// Search cities (for autocomplete)
router.get("/cities/search", controller.searchCities);

module.exports = router;

