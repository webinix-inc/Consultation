# Implementation Plan: Availability Realtime, Export/Payout/Balance, Multiple Categories

**Constraints:** Do NOT change existing routes or field names. Add new routes/fields only where needed.

---

## 1. Availability Changes → Realtime Reflection on Client Side

### Current State
- Route: `PUT /api/v1/consultant-settings/:consultantId/availability` (unchanged)
- Backend saves to DB, returns success. No socket emit.
- Client fetches slots via `GET /api/v1/appointments/available-slots?consultant=&date=` (unchanged)
- Client uses `useQuery` with `staleTime: 30s` (or default). No invalidation on availability change.

### Implementation

| Step | File | Action |
|------|------|--------|
| 1.1 | `backend/src/api/v1/controllers/consultantSettings.controller.js` | After `settings.save()` in `updateAvailabilitySettings`, call `SocketService.emitGlobal("availability:updated", { consultantId, targetUserId })` so all connected clients can invalidate slots for that consultant. |
| 1.2 | `backend/src/api/v1/controllers/consultantSettings.controller.js` | Import `SocketService` at top. |
| 1.3 | `Consultant/src/context/SocketContext.tsx` | Add listener for `availability:updated`. On event, use `queryClient.invalidateQueries({ queryKey: ["available-slots"] })` (need to pass queryClient via context or use `useQueryClient` in a child that has access). |
| 1.4 | `Consultant/src/pages/Consultants.tsx` | Use `useQueryClient` + `useSocket`. In `useEffect`, when socket receives `availability:updated` and `consultantId` matches `sched.consultant`, call `queryClient.invalidateQueries({ queryKey: ["available-slots", "consultant", sched.consultant, selectedDateISO] })`. |
| 1.5 | `Consultant/src/pages/AppointmentManagement.tsx` | Same: listen for `availability:updated`, invalidate `["available-slots", ...]` when consultant matches. |
| 1.6 | `Consultant/src/pages/ClientBookings.tsx` | Same for reschedule flow when `rescheduleItem?.consultantId` matches. |

**Socket event payload:** `{ consultantId, targetUserId }` — clients invalidate slots for that consultant.

**Note:** SocketContext does not have queryClient. Options:
- A) Create `SocketProvider` wrapper that has access to `QueryClientProvider` and exposes an `onAvailabilityUpdated(consultantId)` callback that components can register.
- B) Simpler: Each component that shows slots (`Consultants`, `AppointmentManagement`, `ClientBookings`) uses `useSocket()` + `useQueryClient()` and in `useEffect` subscribes to `availability:updated`, then invalidates its own query when consultant matches.

**Recommended:** Option B — each slot-consuming component subscribes and invalidates. No new context needed.

---

## 2. Export Report, Payout Section, Remaining Balance in Analytics

### 2A. Export Report

**Constraint:** Use existing route `GET /api/v1/analytics/overview` — add `?format=csv` query param for export. No new route.

| Step | File | Action |
|------|------|--------|
| 2A.1 | `backend/src/api/v1/controllers/analytics.controller.js` | In `overview`, check `req.query.format === "csv"`. If true, build CSV string from same data (cards, revenueBreakdown, monthlyTrends, categoryPerformance, topConsultants), set `Content-Type: text/csv`, `Content-Disposition: attachment; filename="analytics-overview-{date}.csv"`, return CSV. Else return JSON as today. |
| 2A.2 | `Consultation_Admin/src/api/analytics.api.ts` | Add `overviewExport: (params) => axiosInstance.get("/analytics/overview", { params: { ...params, format: "csv" }, responseType: "blob" })` — returns blob for download. |
| 2A.3 | `Consultation_Admin/src/pages/Analytics.tsx` | Add Export button. On click, call `AnalyticsAPI.overviewExport({ viewType, year, month })`, create blob URL, trigger download. |
| 2A.4 | `backend/src/api/v1/controllers/analytics.controller.js` | Add `format=csv` support for `consultantStats` (Consultant analytics). Same pattern. |
| 2A.5 | `Consultant/src/api/dashboard.api.ts` | Add `getConsultantStatsExport` that fetches with `format=csv`, `responseType: "blob"`. |
| 2A.6 | `Consultant/src/pages/Analytics.tsx` | Add Export button, trigger download. |

**Existing routes:** `GET /analytics/overview`, `GET /analytics/consultant` — unchanged paths. Only new query param `format`.

---

### 2B. Payout Section & Remaining Balance in Analytics

**Constraint:** Payout data comes from transactions. Use existing `GET /api/v1/transactions` (or equivalent). Do not change route.

| Step | File | Action |
|------|------|--------|
| 2B.1 | `backend/src/api/v1/controllers/analytics.controller.js` | In `overview`, compute `remainingBalance` and `payoutSummary` from Transaction model (same logic as ConsultantDashboard: earnings from Payment+Success, payouts from Payout type). Add to response: `payoutSummary: { totalEarnings, totalPaidOut, remainingBalance }` (platform-level). |
| 2B.2 | `Consultation_Admin/src/pages/Analytics.tsx` | Add new card/section "Payout Summary" showing `totalEarnings`, `totalPaidOut`, `remainingBalance` from `analyticsData.payoutSummary`. |
| 2B.3 | Consultant Analytics | Consultant stats already come from `GET /analytics/consultant`. Add `payoutSummary` (consultant-specific) in `consultantStats` controller: aggregate transactions for logged-in consultant, return `{ totalEarnings, totalPaidOut, remainingBalance }`. |
| 2B.4 | `Consultant/src/pages/Analytics.tsx` | Add "Payout & Balance" card using `statsData.payoutSummary`. |

**Clarification:** Admin Analytics = platform-wide payout summary. Consultant Analytics = consultant-specific payout summary. Both use existing Transaction model and existing analytics routes; we only extend the response payload.

---

## 3. Multiple Categories on Consultant Registration

**Constraint:** Keep `category` and `subcategory` field names. Add new field `categories` (array) for multiple selections.

### Schema Change (Additive Only)

| Step | File | Action |
|------|------|--------|
| 3.1 | `backend/src/models/consultant.model.js` | Add new field: `categories: [{ categoryId: ObjectId, categoryName: String, subcategoryId: ObjectId, subcategoryName: String }]` — array, default `[]`. Do NOT modify `category` or `subcategory`. |
| 3.2 | `backend/src/api/v1/validators/auth.validator.js` | Add to `registerSchema`: `categories: Joi.array().items(Joi.object({ categoryId: Joi.string(), subcategoryId: Joi.string().allow("") })).optional()`. Keep `category`, `subcategory` as-is. |
| 3.3 | `backend/src/api/v1/controllers/auth.controller.js` | In `register`, if `categories` array provided: resolve each to category/subcategory names, push to `categories` array. Set `category` = first item's category name (backward compat). Set `subcategory` = first item's subcategory. Save both `category`/`subcategory` and `categories`. |
| 3.4 | `Consultant/src/pages/CompleteProfile.tsx` | Replace single category/subcategory selects with multi-select UI: allow selecting multiple (category, subcategory) pairs. State: `selectedCategories: Array<{ categoryId, categoryName, subcategoryId, subcategoryName }>`. Add/remove rows. On submit, send `category` = first, `subcategory` = first, `categories` = full array. |
| 3.5 | `Consultant/src/api/auth.api.ts` | Extend `register` payload to accept `categories` array. No route change. |

**Backward compatibility:** Existing consultants have only `category`/`subcategory`. New consultants can have `categories` array. Consumers that filter by category can: (a) use `category` for primary, or (b) use `categories` for full list. No breaking changes.

---

## Files to Create/Modify Summary

### Backend
| File | Changes |
|------|---------|
| `consultantSettings.controller.js` | Emit `availability:updated` after save; import SocketService |
| `analytics.controller.js` | Add `format=csv` handling; add `payoutSummary` to overview & consultantStats |
| `auth.controller.js` | Handle `categories` array in register |
| `auth.validator.js` | Add `categories` to registerSchema |
| `consultant.model.js` | Add `categories` array field |

### Consultant App (Client)
| File | Changes |
|------|---------|
| `SocketContext.tsx` | (Optional) document event; components handle |
| `Consultants.tsx` | Listen `availability:updated`, invalidate slots query |
| `AppointmentManagement.tsx` | Same |
| `ClientBookings.tsx` | Same |
| `CompleteProfile.tsx` | Multi-category select UI; send `categories` |
| `Analytics.tsx` | Export button; Payout & Balance card |
| `dashboard.api.ts` | Add export method |
| `auth.api.ts` | Extend register payload (categories) |

### Admin App
| File | Changes |
|------|---------|
| `Analytics.tsx` | Export button; Payout Summary & Remaining Balance section |
| `analytics.api.ts` | Add overviewExport |

---

## Route & Field Summary (No Changes)

| Item | Status |
|------|--------|
| `PUT /consultant-settings/:consultantId/availability` | Unchanged |
| `GET /appointments/available-slots` | Unchanged |
| `GET /analytics/overview` | Unchanged (add optional `?format=csv`) |
| `GET /analytics/consultant` | Unchanged (extend response) |
| `POST /auth/register` | Unchanged (extend body with `categories`) |
| `category` field | Unchanged |
| `subcategory` field | Unchanged |

---

## Execution Order

1. **Phase 1 — Availability Realtime:** Backend emit → Frontend listeners + invalidation
2. **Phase 2 — Export:** Backend CSV support → Frontend Export buttons
3. **Phase 3 — Payout/Balance in Analytics:** Backend extend response → Frontend cards
4. **Phase 4 — Multiple Categories:** Schema + validator + controller + CompleteProfile UI
