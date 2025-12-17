// Success Messages
const SUCCESS = {
  // Authentication
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  PROFILE_UPDATED: "Profile updated successfully",
  
  // User Management
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USERS_FETCHED: "Users retrieved successfully",
  
  // Job Management
  JOB_CREATED: "Job created successfully",
  JOB_UPDATED: "Job updated successfully",
  JOB_DELETED: "Job deleted successfully",
  JOB_STATUS_UPDATED: "Job status updated successfully",
  JOBS_FETCHED: "Jobs retrieved successfully",
  JOB_FETCHED: "Job details retrieved successfully",
  
  // General
  DATA_FETCHED: "Data retrieved successfully",
  OPERATION_SUCCESS: "Operation completed successfully",
};

// Error Messages
const ERROR = {
  // Authentication
  INVALID_CREDENTIALS: "Invalid email or password",
  TOKEN_REQUIRED: "Access token is required",
  TOKEN_INVALID: "Invalid or expired token",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access denied. Insufficient permissions",
  
  // User Management
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User with this email already exists",
  USER_ID_EXISTS: "User ID already exists",
  
  // Job Management
  JOB_NOT_FOUND: "Job not found",
  JOB_ALREADY_EXISTS: "Job with this title already exists",
  
  // Validation
  VALIDATION_ERROR: "Validation failed",
  INVALID_ID: "Invalid ID format",
  REQUIRED_FIELD_MISSING: "Required field is missing",
  
  // General
  INTERNAL_SERVER_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  BAD_REQUEST: "Bad request",
  SOMETHING_WENT_WRONG: "Something went wrong",
};

// Validation Messages
const VALIDATION = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Please provide a valid email address",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_MIN_LENGTH: "Password must be at least 6 characters long",
  NAME_REQUIRED: "Name is required",
  NAME_MIN_LENGTH: "Name must be at least 2 characters long",
  ROLE_REQUIRED: "Role is required",
  ROLE_INVALID: "Invalid role specified",
};

module.exports = {
  SUCCESS,
  ERROR,
  VALIDATION,
};
