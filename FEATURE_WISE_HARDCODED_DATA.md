# Feature-wise Hardcoded Data Breakdown

## 📋 Quick Reference by Feature

This document organizes all hardcoded data by feature/page for easy reference during refactoring.

---

## 🔴 CRITICAL Priority

### Feature 1: Analytics Dashboard

#### **Page:** `Consultant/src/pages/Analytics.tsx`
**Lines:** 10-17, 19, 21-26, 59, 73, 88, 226-237

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Monthly Revenue (6 months) | Array of 6 months with revenue | `GET /api/v1/analytics/consultant` → `monthlyRevenue` |
| Weekly Appointments | `[8, 12, 10, 16, 12, 7, 3]` | `GET /api/v1/analytics/consultant` → `weeklyAppointments` |
| Performance Metrics | `{sessionCompletion: 96, avgRating: 4.8, responseTime: 2, rebookingRate: 78}` | `GET /api/v1/analytics/consultant` → `performance` |
| Monthly Revenue Display | `₹ 1,56,523` | API response |
| Total Sessions | `4` | API response |
| Badge Count | `04` | API response |
| Summary Revenue | `₹ 3,80,000` | API response |
| Active Consultants | `24` | API response |
| Total Appointments | `1,240` | API response |

**Backend Action Required:** Enhance `GET /api/v1/analytics/consultant` endpoint

---

#### **Page:** `Consultation_Admin/src/pages/Analytics.tsx`
**Lines:** 9-16, 18-24, 26-33, 65

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Category Performance | Array of 6 categories with revenue, sessions, rates, growth | `GET /api/v1/analytics/overview` → `categoryPerformance` |
| Top Consultants | Array of 5 consultants with rankings | `GET /api/v1/analytics/overview` → `topConsultants` |
| Monthly Revenue | Array of 6 months with revenue and appointments | `GET /api/v1/analytics/overview` → `monthlyTrends` |
| Badge Count | `04` | API response |

**Backend Action Required:** Enhance `GET /api/v1/analytics/overview` endpoint

---

### Feature 2: Document Management

#### **Page:** `Consultant/src/pages/ClientDocuments.tsx`
**Lines:** 43-89, 91-96, 194-199

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Documents Array | 5 mock documents with full details | `GET /api/v1/documents` |
| Document Type Badges | CSS classes for each type | Theme config or API |
| Document Type Options | 4 hardcoded types in dropdown | `GET /api/v1/document-types` |

**Backend Action Required:** 
- ❌ **CREATE** `GET /api/v1/documents` endpoint
- ❌ **CREATE** `POST /api/v1/documents` endpoint
- ❌ **CREATE** `GET /api/v1/document-types` endpoint

---

#### **Page:** `Consultant/src/pages/Consultant_ClientProfile.tsx`
**Lines:** 801-847, 848-853, 933-938

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Documents Array | Same 5 mock documents (DUPLICATE) | `GET /api/v1/documents` |
| Document Type Badges | Same CSS classes (DUPLICATE) | Theme config or API |
| Document Type Options | Same 4 types (DUPLICATE) | `GET /api/v1/document-types` |

**Backend Action Required:** Same as above

---

## 🟡 HIGH Priority

### Feature 3: Client Dashboard (Admin)

#### **Page:** `Consultation_Admin/src/pages/ClientDashboard.tsx`
**Lines:** 33-36, 198-231

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Statistics Cards | 4 cards with hardcoded values | `GET /api/v1/analytics/client` |
| Mock Appointments | 3 appointment objects | `GET /api/v1/appointments?clientId=:id` |

**Backend Action Required:** Use existing `GET /api/v1/analytics/client` endpoint

---

## 🟢 MEDIUM Priority

### Feature 4: Settings & Configuration

#### **Page:** `Consultant/src/pages/Settings.tsx`
**Lines:** 101-125, 558

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Default Settings | Complete settings object with defaults | `GET /api/v1/consultant-settings/:id` (return defaults if not set) |
| Default Duration | `60` minutes | Backend default or config |

**Backend Action Required:** Update settings endpoint to return defaults

---

### Feature 5: Payment Status Filters

#### **Page:** `Consultant/src/pages/ClientPayments.tsx`
**Lines:** 256-258

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Status Filter Options | Only "All Payments" and "Completed" | Generate from `TRANSACTION_STATUSES` constant |

**Backend Action Required:** Use existing transaction status enum

---

### Feature 6: Status Enums (Multiple Files)

#### **Files:**
- `Consultant/src/pages/ClientBookings.tsx` (Lines 477-478)
- `Consultant/src/pages/Consultant_ClientProfile.tsx` (Lines 597-598)

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Upcoming Statuses | `["Upcoming", "Confirmed", "Pending"]` | `APPOINTMENT_STATUSES` constant |
| Past Statuses | `["Completed", "Cancelled"]` | `APPOINTMENT_STATUSES` constant |

**Action Required:** Create constants file

---

## 🔵 LOW Priority

### Feature 7: UI Configuration

#### **Page:** `Consultation_Admin/src/pages/Dashboard.tsx`
**Lines:** 159-166

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Chart Colors | Array of 6 hex colors | Theme config or API config |

**Action Required:** Move to theme/config (optional)

---

#### **Page:** `Consultant/src/pages/ClientManagement.tsx`
**Lines:** 813-815

| Data Type | Hardcoded Value | Should Come From |
|-----------|----------------|------------------|
| Pagination Options | `[10, 20, 50]` | Config or constant |

**Action Required:** Move to constants (optional)

---

## 📊 Summary Table

| Feature | Files Affected | Hardcoded Items | Priority | Backend API Status |
|---------|---------------|-----------------|----------|-------------------|
| Analytics (Consultant) | 1 | 9 items | CRITICAL | ⚠️ Needs Enhancement |
| Analytics (Admin) | 1 | 4 items | CRITICAL | ⚠️ Needs Enhancement |
| Documents | 2 | 3 items (duplicated) | CRITICAL | ❌ Missing |
| Client Dashboard | 1 | 2 items | HIGH | ✅ Exists |
| Settings | 1 | 2 items | MEDIUM | ⚠️ Needs Enhancement |
| Payment Filters | 1 | 1 item | MEDIUM | ✅ Exists |
| Status Enums | 2 | 2 items | MEDIUM | ✅ Exists |
| UI Config | 2 | 2 items | LOW | Optional |

---

## 🎯 Quick Action Checklist

### Immediate (This Week)
- [ ] Create document management API (backend)
- [ ] Enhance analytics endpoints (backend)
- [ ] Create constants file (frontend)
- [ ] Remove hardcoded analytics data (frontend)

### Short Term (Next Week)
- [ ] Remove hardcoded documents (frontend)
- [ ] Update settings to use backend defaults
- [ ] Fix payment status filters
- [ ] Replace status enums with constants

### Long Term (This Month)
- [ ] Move UI config to theme
- [ ] Break down large components
- [ ] Extract all duplicate functions
- [ ] Create custom hooks for queries

---

This breakdown makes it easy to track progress and prioritize work during refactoring.

