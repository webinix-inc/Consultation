/**
 * Date and Time Utility Functions
 * Centralized date/time manipulation functions for Admin panel
 */

/**
 * Normalizes a time string to "HH:mm" format
 * Handles both 12-hour (AM/PM) and 24-hour formats
 */
export function normalizeTimeString(t: string): string {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) {
    const [timePart, ampm] = t.split(" ");
    let [h, m] = timePart.split(":").map(Number);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return t;
}

/**
 * Formats a Date object to display format with 12-hour time
 */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats a date string or Date object to a readable format
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString();
}

