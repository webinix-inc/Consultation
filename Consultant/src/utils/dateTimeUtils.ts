/**
 * Date and Time Utility Functions
 * Centralized date/time manipulation functions to avoid duplication
 */

/**
 * Normalizes a time string to "HH:mm" format
 * Handles both 12-hour (AM/PM) and 24-hour formats
 * 
 * @param t - Time string in various formats
 * @returns Normalized time string in "HH:mm" format
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
  // assume already "HH:mm"
  return t;
}

/**
 * Parses a time slot string into start and end Date objects
 * Supports formats: "HH:mm - HH:mm", "HH:mm AM/PM", or "HH:mm"
 * 
 * @param date - Base date for the slot
 * @param slot - Slot string in various formats
 * @param durationMin - Default duration in minutes if end time not provided
 * @returns Object with start and end Date objects
 */
export function parseSlotToRange(date: Date, slot: string, durationMin: number = 60): { start: Date; end: Date } {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  let startH = 0;
  let startM = 0;
  let endH = 0;
  let endM = 0;
  let hasExplicitEnd = false;

  if (slot.includes(" - ")) {
    const [startStr, endStr] = slot.split(" - ");
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    startH = sh;
    startM = isNaN(sm) ? 0 : sm;
    endH = eh;
    endM = isNaN(em) ? 0 : em;
    hasExplicitEnd = true;
  } else if (slot.includes("AM") || slot.includes("PM")) {
    const [timePart, ampm] = slot.split(" ");
    const [h, m] = timePart.split(":").map(Number);
    startH = h;
    startM = isNaN(m) ? 0 : m;
    if (ampm === "PM" && startH < 12) startH += 12;
    if (ampm === "AM" && startH === 12) startH = 0;
  } else {
    const [h, m] = slot.split(":").map(Number);
    startH = h;
    startM = isNaN(m) ? 0 : m;
  }

  const start = new Date(base);
  start.setHours(startH, startM, 0, 0);

  let end: Date;
  if (hasExplicitEnd) {
    end = new Date(base);
    end.setHours(endH, endM, 0, 0);
  } else {
    end = new Date(start.getTime() + durationMin * 60 * 1000);
  }

  return { start, end };
}

/**
 * Formats a Date object to display format (e.g., "2:30 PM")
 * 
 * @param d - Date object
 * @returns Formatted time string
 */
export function formatToDisplay(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: "numeric", minute: "2-digit", hour12: true, timeZone: 'Asia/Kolkata' });
}

/**
 * Formats a Date object to "HH:mm" format
 * 
 * @param d - Date object
 * @returns Time string in "HH:mm" format
 */
export function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Formats a Date object to ISO date-only string (YYYY-MM-DD)
 * 
 * @param date - Date object
 * @returns ISO date string
 */
export function isoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats appointment date, time, and session into a readable string
 * 
 * @param date - Date string
 * @param start - Start time string
 * @param end - End time string
 * @param session - Session type
 * @param includeDuration - Whether to include duration in minutes (default: false)
 * @returns Formatted date line string
 */
export function formatDateLine(date: string, start: string, end: string, session: string, includeDuration: boolean = false): string {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const startNormalized = normalizeTimeString(start);
  const endNormalized = end ? normalizeTimeString(end) : null;

  let timeStr = '';
  if (includeDuration && endNormalized) {
    const [sH, sM] = startNormalized.split(':').map(Number);
    const [eH, eM] = endNormalized.split(':').map(Number);
    const duration = (eH * 60 + eM) - (sH * 60 + sM);

    // Use Intl for consistent IST display
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    const timeDisplay = new Intl.DateTimeFormat('en-IN', options).format(d);

    timeStr = `${timeDisplay} (${duration} min)`;
  } else if (endNormalized) {
    timeStr = `${startNormalized} - ${endNormalized}`;
  } else {
    timeStr = startNormalized;
  }

  return `${dateStr} ${timeStr} ${session}`;
}

/**
 * Formats a date string or Date object to a readable format
 * 
 * @param dateString - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Checks if the current time is within the appointment time range
 * 
 * @param dateStr - Date string
 * @param timeStart - Start time string
 * @param timeEnd - End time string (optional)
 * @returns True if current time is within the appointment range
 */
export function checkIsNow(dateStr?: string, timeStart?: string, timeEnd?: string): boolean {
  if (!dateStr || !timeStart) return false;
  const now = new Date();

  const [h, m] = timeStart.split(":").map(Number);
  const start = new Date(dateStr);
  start.setHours(h, m, 0, 0);

  let end: Date;
  if (timeEnd) {
    const [eh, em] = timeEnd.split(":").map(Number);
    end = new Date(dateStr);
    end.setHours(eh, em, 0, 0);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  return now >= start && now <= end;
}


/**
 * Formats appointment date line from Date objects
 */
export function formatDateLineFromDates(start: Date, end: Date, session: string): string {
  if (!start) return "";
  const dateStr = start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const startStr = start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

  if (end) {
    const diffMs = end.getTime() - start.getTime();
    const diffMin = Math.round(diffMs / 60000);
    return `${dateStr} ${startStr} (${diffMin} min) ${session}`;
  }
  return `${dateStr} ${startStr} ${session}`;
}

/**
 * Checks if now is within Date range
 */
export function checkIsNowFromDates(start: Date, end: Date): boolean {
  if (!start) return false;
  const now = new Date();
  const e = end || new Date(start.getTime() + 60 * 60 * 1000);
  return now >= start && now <= e;
}
