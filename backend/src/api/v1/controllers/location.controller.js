const Consultant = require("../../../models/consultant.model");
const { sendSuccess, sendError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

// Get all unique states from consultants
exports.getStates = async (req, res, next) => {
  try {
    const states = await Consultant.distinct("state", { state: { $ne: null, $ne: "" } });
    const sortedStates = states.sort();
    return sendSuccess(res, "States fetched successfully", sortedStates);
  } catch (error) {
    next(error);
  }
};

// Get all unique cities from consultants
exports.getCities = async (req, res, next) => {
  try {
    const { state } = req.query;
    
    let query = { city: { $ne: null, $ne: "" } };
    
    // If state is provided, filter cities by state
    if (state) {
      query.state = state;
    }
    
    const cities = await Consultant.distinct("city", query);
    const sortedCities = cities.sort();
    return sendSuccess(res, "Cities fetched successfully", sortedCities);
  } catch (error) {
    next(error);
  }
};

// Search states (for autocomplete)
exports.searchStates = async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = { state: { $ne: null, $ne: "" } };
    
    if (q) {
      const { escapeRegex } = require("../../../utils/string.util");
      const escaped = escapeRegex(String(q).slice(0, 100));
      if (escaped) query.state = { $regex: escaped, $options: "i" };
    }
    
    const states = await Consultant.distinct("state", query);
    const sortedStates = states.sort();
    return sendSuccess(res, "States fetched successfully", sortedStates);
  } catch (error) {
    next(error);
  }
};

// Search cities (for autocomplete)
exports.searchCities = async (req, res, next) => {
  try {
    const { q, state } = req.query;
    let query = { city: { $ne: null, $ne: "" } };
    
    if (state) {
      query.state = state;
    }
    
    if (q) {
      const { escapeRegex } = require("../../../utils/string.util");
      const escaped = escapeRegex(String(q).slice(0, 100));
      if (escaped) query.city = { $regex: escaped, $options: "i" };
    }
    
    const cities = await Consultant.distinct("city", query);
    const sortedCities = cities.sort();
    return sendSuccess(res, "Cities fetched successfully", sortedCities);
  } catch (error) {
    next(error);
  }
};

