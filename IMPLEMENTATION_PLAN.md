# Fix Appointment Time Display Issue

## Goal
Fix the issue where appointment times on the Consultant interface are displayed incorrectly (shifted by timezone offset). The goal is to ensure that if a user books "10:00 AM", it displays as "10:00 AM" regardless of the server's timezone interpretation.

## Problem Analysis
- **Current Behavior**: The frontend (`AppointmentManagement.tsx`) prefers `it.startAt` (ISO UTC Date) over `it.date` + `it.timeStart` when constructing the display date/time.
- **Root Cause**: The backend receives `date` ("YYYY-MM-DD") and `time` ("HH:MM") and constructs `startAt` using `new Date(...)`. On a UTC server, this treats the input as UTC. When the frontend receives this UTC date and calls `toLocaleTimeString()`, it converts it to the user's local time (e.g., +5:30 for IST), resulting in a shifted time (e.g., 10:00 becomes 15:30).
- **Desired Behavior**: The application should treat the booked time as "Floating Time" (local to the user/context) for display purposes, ignoring the server's UTC re-interpretation.

## Proposed Changes

### Frontend
#### [Consultant/src/pages/AppointmentManagement.tsx](file:///d:/NexFutrr/Consultation/Consultation/Consultation/Consultant/src/pages/AppointmentManagement.tsx)
- Modify the `mappedAppointments` useMemo logic.
- Change the precedence for calculating `start` and `end` date objects.
- PRIORITIZE `it.date` and `it.timeStart`/`it.timeEnd` (if they exist) over `it.startAt`.
- This ensures `new Date("YYYY-MM-DD" + "T" + "HH:MM")` is called in the browser, creating a Date object that matches the visual string in the user's local time.

```typescript
// Current
const start = it.startAt ? new Date(it.startAt) : ...

// New
const start = (it.date && it.timeStart) 
  ? new Date(`${it.date}T${normalizeTimeString(it.timeStart)}:00`) 
  : (it.startAt ? new Date(it.startAt) : null);
```
- Apply similar logic for `end`.

## Verification Plan
### Manual Verification
1.  **Serve** the consultant app locally.
2.  **View** the "Appointment Management" page.
3.  **Check** an existing appointment known to be "10:00 AM".
4.  **Confirm** it displays "10:00 AM" (or the correct booked time) instead of a shifted time (like 3:30 PM).
