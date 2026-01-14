const { toZonedTime, fromZonedTime, format } = require('date-fns-tz');
const { parse, isValid, addMinutes, startOfDay, endOfDay } = require('date-fns');

const TIMEZONE = 'Asia/Kolkata';

// Helper: Get Current Time in IST (referenced as UTC Date object)
const nowIST = () => toZonedTime(new Date(), TIMEZONE);

/**
 * Parse a "YYYY-MM-DD" and "HH:mm" string (assumed IST) into a UTC Date object
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @returns {Date} UTC Date object
 */
const parseBookingDate = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    // Create a string that date-fns-tz can parse as IST
    // Format: "2023-11-23 09:00"
    const dateTimeStr = `${dateStr} ${timeStr}`;

    // Parse this string AS IF it is in Asia/Kolkata
    // fromZonedTime takes a string (or date) and a timezone, and returns the strictly corresponding UTC date
    const utcDate = fromZonedTime(dateTimeStr, TIMEZONE);

    if (!isValid(utcDate)) {
        throw new Error('Invalid date/time provided');
    }

    return utcDate;
};

/**
 * Format a Date object (UTC) to a string in IST
 * @param {Date} date - UTC Date object
 * @param {string} fmtStr - Format string (e.g., 'yyyy-MM-dd', 'HH:mm')
 * @returns {string} Formatted string in IST
 */
const formatToIST = (date, fmtStr = 'yyyy-MM-dd') => {
    if (!date) return '';
    return format(toZonedTime(date, TIMEZONE), fmtStr, { timeZone: TIMEZONE });
};

/**
 * Get start and end of day in UTC for a given IST date string
 * Used for database queries to cover the full IST day
 * @param {string} dateStr - YYYY-MM-DD (IST)
 * @returns {{ start: Date, end: Date }} UTC start and end
 */
const getISTDayRangeInUTC = (dateStr) => {
    // Parsing "2023-11-23 00:00" IST -> UTC
    const start = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE);
    // Parsing "2023-11-23 23:59:59.999" IST -> UTC
    const end = fromZonedTime(`${dateStr} 23:59:59.999`, TIMEZONE);
    return { start, end };
};

/**
 * Check if a given UTC date is in the past relative to IST now + buffer
 * @param {Date} dateUTC 
 * @param {number} bufferMinutes 
 * @returns {boolean}
 */
const isPastIST = (dateUTC, bufferMinutes = 0) => {
    const now = new Date(); // UTC now
    const bufferedNow = addMinutes(now, bufferMinutes);
    return dateUTC < bufferedNow;
};

module.exports = {
    TIMEZONE,
    nowIST,
    parseBookingDate,
    formatToIST,
    getISTDayRangeInUTC,
    isPastIST
};
