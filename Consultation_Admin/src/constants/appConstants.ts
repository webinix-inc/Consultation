/**
 * Application Constants
 * Centralized constants matching backend enums and configurations
 */

// ============================================
// Appointment Statuses
// ============================================
export const APPOINTMENT_STATUSES = {
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

export const APPOINTMENT_STATUS_ARRAY = Object.values(APPOINTMENT_STATUSES);

// Status arrays for filtering
export const UPCOMING_STATUSES = [
  APPOINTMENT_STATUSES.UPCOMING,
] as const;

export const PAST_STATUSES = [
  APPOINTMENT_STATUSES.COMPLETED,
  APPOINTMENT_STATUSES.CANCELLED,
] as const;

// ============================================
// Transaction Statuses
// ============================================
export const TRANSACTION_STATUSES = {
  PENDING: "Pending",
  SUCCESS: "Success",
  FAILED: "Failed",
  REFUNDED: "Refunded",
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES];

export const TRANSACTION_STATUS_ARRAY = Object.values(TRANSACTION_STATUSES);

// ============================================
// Document Types (Temporary - will be from API later)
// ============================================
export const DOCUMENT_TYPES = {
  MEDICAL_REPORT: "Medical Report",
  CONSULTATION_NOTES: "Consultation Notes",
  PRESCRIPTION: "Prescription",
  INVOICE: "Invoice",
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_TYPE_ARRAY = Object.values(DOCUMENT_TYPES);

// ============================================
// User Roles
// ============================================
export const USER_ROLES = {
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
  CONSULTANT: "Consultant",
  CLIENT: "Client",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ============================================
// Configuration Constants
// ============================================
export const PAGINATION_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 8;
export const DEFAULT_SESSION_DURATION = 60; // minutes
export const DEFAULT_BUFFER_TIME = 15; // minutes
export const DEFAULT_MAX_SESSIONS_PER_DAY = 8;
export const DEBOUNCE_DELAY = 300; // milliseconds
export const OTP_TIMER = 30; // seconds

// ============================================
// Session Types
// ============================================
export const SESSION_TYPES = {
  VIDEO_CALL: "Video Call",
} as const;

export type SessionType = typeof SESSION_TYPES[keyof typeof SESSION_TYPES];

