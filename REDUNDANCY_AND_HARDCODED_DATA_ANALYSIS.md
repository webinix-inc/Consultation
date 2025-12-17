# Redundancy & Hardcoded Data Analysis - Comprehensive Report

## 📋 Executive Summary

This document provides a thorough analysis of:
1. **Redundant Methods & Functions** - Duplicate code that should be consolidated
2. **Scalability Issues** - Code patterns that limit scalability
3. **Feature-wise Hardcoded Data** - All hardcoded values organized by page/feature
4. **Removal Plan** - Step-by-step plan to eliminate hardcoded data and redundancy

---

## 🔴 Part 1: Redundant Methods & Functions

### 1.1 **Time Normalization Functions** (CRITICAL - 3 duplicates)

**Duplicate Function:** `normalizeTimeString(t: string)`

**Locations:**
1. `Consultant/src/pages/AppointmentManagement.tsx` (Line 75)
2. `Consultant/src/pages/ClientBookings.tsx` (Line 25)
3. `Consultation_Admin/src/pages/AppointmentManagement.tsx` (Line 117 - inline)

**Impact:** High - Used extensively for time parsing
**Solution:** Extract to `Consultant/src/utils/dateTimeUtils.ts` and `Consultation_Admin/src/utils/dateTimeUtils.ts`

---

### 1.2 **Slot Parsing Functions** (CRITICAL - 2 duplicates)

**Duplicate Function:** `parseSlotToRange(date: Date, slot: string, durationMin = 60)`

**Locations:**
1. `Consultant/src/pages/AppointmentManagement.tsx` (Line 88)
2. `Consultant/src/pages/ClientBookings.tsx` (Line 37)

**Impact:** High - Core appointment scheduling logic
**Solution:** Extract to shared utils file

---

### 1.3 **Date Formatting Functions** (MEDIUM - 4 duplicates)

**Duplicate Functions:**
- `formatHHMM(d: Date)` - 2 locations
- `isoDateOnly(date: Date)` - 2 locations
- `formatDateLine(date, start, end, session)` - 2 locations
- `formatDate(dateString)` - Multiple locations with different implementations

**Locations:**
- `formatHHMM`: `AppointmentManagement.tsx` (Line 134), `ClientBookings.tsx` (Line 79)
- `isoDateOnly`: `AppointmentManagement.tsx` (Line 140), `ClientBookings.tsx` (Line 85)
- `formatDateLine`: `ClientBookings.tsx` (Line 117), `Consultant_ClientProfile.tsx` (Line 512)
- `formatDate`: `ClientManagement.tsx` (Line 703), `Consultation_Admin/AppointmentManagement.tsx` (Line 271)

**Impact:** Medium - Date formatting inconsistencies
**Solution:** Create unified date formatting utilities

---

### 1.4 **String Normalization Functions** (MEDIUM - 4 duplicates)

**Duplicate Function:** `normalize(s: string)` - For search/filter normalization

**Locations:**
1. `Consultant/src/pages/ClientDocuments.tsx` (Line 25)
2. `Consultant/src/pages/ClientPayments.tsx` (Line 30)
3. `Consultant/src/pages/Consultant_ClientProfile.tsx` (Line 48)

**Impact:** Medium - Search functionality
**Solution:** Extract to `utils/stringUtils.ts`

---

### 1.5 **Payment/Transaction Mapping** (MEDIUM - 2 duplicates)

**Duplicate Logic:** Transaction to PaymentItem mapping

**Locations:**
1. `Consultant/src/pages/ClientPayments.tsx` (Lines 205-218)
2. `Consultant/src/pages/Consultant_ClientProfile.tsx` (Lines 1095-1108)

**Impact:** Medium - Data transformation duplication
**Solution:** Extract to shared transformer utility

---

### 1.6 **Filter Functions** (LOW - 2 duplicates)

**Duplicate Function:** `filterPayments(items, q)`

**Locations:**
1. `Consultant/src/pages/ClientPayments.tsx` (Line 177)
2. `Consultant/src/pages/Consultant_ClientProfile.tsx` (Line 1076)

**Impact:** Low - Simple filter logic
**Solution:** Extract to shared filter utilities

---

### 1.7 **Error Normalization** (LOW - 2 duplicates)

**Duplicate Function:** `normalizeAxiosError(e: any)`

**Locations:**
1. `Consultant/src/api/appointment.api.ts` (Line 45)
2. `Consultant/src/api/clientConsultant.api.ts` (Line 53)

**Impact:** Low - Error handling
**Solution:** Extract to shared API utilities

---

### 1.8 **Document Type Badge Classes** (LOW - 2 duplicates)

**Duplicate Constant:** `typeBadgeCls` - Document type styling

**Locations:**
1. `Consultant/src/pages/ClientDocuments.tsx` (Lines 91-96)
2. `Consultant/src/pages/Consultant_ClientProfile.tsx` (Lines 848-853)

**Impact:** Low - UI styling
**Solution:** Extract to theme/constants file

---

## 🟡 Part 2: Scalability Issues

### 2.1 **Large Component Files**

**Issues:**
- `Consultant/src/pages/AppointmentManagement.tsx` - 1143 lines
- `Consultant/src/pages/Consultant_Profile.tsx` - 1705 lines
- `Consultant/src/pages/Consultant_ClientProfile.tsx` - 1366 lines
- `Consultation_Admin/src/pages/ConsultantDashboard.tsx` - 1797 lines

**Impact:** High - Hard to maintain, test, and scale
**Solution:** Break into smaller components and hooks

---

### 2.2 **Inline Data Transformation**

**Issue:** Data mapping/transformation done inline in components

**Examples:**
- `mappedAppointments` in `AppointmentManagement.tsx` (Line 375)
- `mappedTransactions` in `ClientPayments.tsx` (Line 205)
- `mappedAppointments` in Admin `AppointmentManagement.tsx` (Line 103)

**Impact:** Medium - Hard to reuse, test, and maintain
**Solution:** Extract to transformer functions or custom hooks

---

### 2.3 **Repeated Query Logic**

**Issue:** Similar useQuery patterns repeated across components

**Examples:**
- User fetching logic repeated
- Consultant fetching logic repeated
- Category fetching logic repeated

**Impact:** Medium - Code duplication, inconsistent error handling
**Solution:** Create custom hooks (useUsers, useConsultants, useCategories)

---

### 2.4 **Hardcoded Magic Numbers**

**Issues:**
- `pageSize = 8` - Hardcoded in multiple places
- `durationMin = 60` - Default duration hardcoded
- `bufferTime = 15` - Buffer time hardcoded
- Timer values: `30` seconds, `300ms` debounce

**Impact:** Low - Should be configurable
**Solution:** Extract to constants or configuration

---

### 2.5 **No Shared Constants File**

**Issue:** Status enums, types, and constants scattered across files

**Examples:**
- Appointment statuses: `["Upcoming", "Confirmed", "Completed", "Cancelled"]` repeated
- Transaction statuses repeated
- Document types hardcoded in multiple places

**Impact:** Medium - Inconsistency risk, hard to maintain
**Solution:** Create `constants/appConstants.ts` with all enums

---

## 🔴 Part 3: Feature-wise Hardcoded Data

### 3.1 **Analytics Feature**

#### **Page:** `Consultant/src/pages/Analytics.tsx`

**Hardcoded Data:**
```typescript
// Lines 10-17: Monthly revenue (6 months)
const months = [
  { name: "May", revenue: 220000 },
  { name: "Jun", revenue: 275000 },
  { name: "Jul", revenue: 320000 },
  { name: "Aug", revenue: 370000 },
  { name: "Sep", revenue: 350000 },
  { name: "Oct", revenue: 380000 },
];

// Line 19: Weekly appointments
const weeklyAppointments = [8, 12, 10, 16, 12, 7, 3];

// Lines 21-26: Performance metrics
const performance = {
  sessionCompletion: 96,
  avgRating: 4.8,
  responseTime: 2,
  rebookingRate: 78,
};

// Line 59: Hardcoded revenue
₹ 1,56,523

// Line 73: Hardcoded sessions
4

// Line 88: Hardcoded badge
04

// Line 226: Hardcoded summary
₹ 3,80,000
24 (consultants)
1,240 (appointments)
```

**Backend API:** `GET /api/v1/analytics/consultant` (needs enhancement)
**Priority:** CRITICAL

---

#### **Page:** `Consultation_Admin/src/pages/Analytics.tsx`

**Hardcoded Data:**
```typescript
// Lines 9-16: Category performance
const categoryData = [
  { name: "Legal", revenue: 65000, sessions: 87, rate: "₹300/hr avg", growth: "+15%" },
  { name: "Finance", revenue: 52000, sessions: 145, rate: "₹200/hr avg", growth: "+23%" },
  // ... 4 more categories
];

// Lines 18-24: Top consultants
const consultants = [
  { rank: 1, name: "Lisa Johnson", category: "Legal", rating: 4.9, sessions: 75, revenue: 22500 },
  // ... 4 more consultants
];

// Lines 26-33: Monthly revenue
const months = [
  { name: "Jan", revenue: 85000, appt: 245 },
  // ... 5 more months
];

// Line 65: Badge count
04
```

**Backend API:** `GET /api/v1/analytics/overview` (needs enhancement)
**Priority:** CRITICAL

---

### 3.2 **Documents Feature**

#### **Page:** `Consultant/src/pages/ClientDocuments.tsx`

**Hardcoded Data:**
```typescript
// Lines 43-89: Mock documents array
const DOCS: DocItem[] = [
  {
    id: "1",
    title: "Medical Report – Amit Patel.pdf",
    type: "Medical Report",
    client: "Amit Patel",
    consultant: "Dr. Priya Sharma",
    size: "2.4 MB",
    date: "2024-10-20",
  },
  // ... 4 more documents
];

// Lines 91-96: Document type badge classes
const typeBadgeCls: Record<DocItem["type"], string> = {
  "Medical Report": "bg-blue-100 text-blue-700 border-blue-200",
  "Consultation Notes": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Prescription: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Invoice: "bg-orange-100 text-orange-700 border-orange-200",
};

// Lines 194-199: Document type options
<SelectItem value="Medical Report">Medical Report</SelectItem>
<SelectItem value="Consultation Notes">Consultation Notes</SelectItem>
<SelectItem value="Prescription">Prescription</SelectItem>
<SelectItem value="Invoice">Invoice</SelectItem>
```

**Backend API:** ❌ **MISSING** - Needs to be created
**Priority:** CRITICAL

---

#### **Page:** `Consultant/src/pages/Consultant_ClientProfile.tsx`

**Hardcoded Data:**
```typescript
// Lines 801-847: Same DOCS array (duplicate)
const DOCS: DocItem[] = [ /* same as above */ ];

// Lines 848-853: Same typeBadgeCls (duplicate)
const typeBadgeCls: Record<DocItem["type"], string> = { /* same as above */ };

// Lines 933-938: Same document type options
```

**Backend API:** ❌ **MISSING** - Needs to be created
**Priority:** CRITICAL

---

### 3.3 **Client Dashboard Feature**

#### **Page:** `Consultation_Admin/src/pages/ClientDashboard.tsx`

**Hardcoded Data:**
```typescript
// Lines 33-36: Statistics
{ title: "Today Appointments", value: "108", delta: "+20%", color: "blue" },
{ title: "Completed Sessions", value: "32", delta: "-15%", color: "orange" },
{ title: "Upcoming Appointments", value: "65", delta: "+18%", color: "violet" },
{ title: "Total Spent", value: "₹1,56,523", delta: "+12%", color: "pink" },

// Lines 198-231: Mock appointments
[
  {
    initials: "DSW",
    name: "Dr. Sarah Wilson",
    tags: ["Health"],
    status: "Confirmed",
    date: "Fri, Oct 24",
    time: "10:00 AM (60 min)",
    mode: "Virtual",
    notes: "Follow up on blood pressure medication",
    price: "$150",
  },
  // ... 2 more appointments
]
```

**Backend API:** `GET /api/v1/analytics/client` (exists but not used)
**Priority:** HIGH

---

### 3.4 **Settings Feature**

#### **Page:** `Consultant/src/pages/Settings.tsx`

**Hardcoded Data:**
```typescript
// Lines 101-125: Default settings
function defaultSettings(): ConsultantSettings {
  return {
    notifications: {
      email: true,
      sms: false,
      appointmentReminders: true,
      clientMsgs: true,
      weeklyReports: true,
    },
    availability: {
      acceptingNewClients: true,
      currentStatus: "available",
      workingHours: {
        monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
        // ... all days with 9-5 schedule
      },
      sessionSettings: { defaultDuration: 60, bufferTime: 15, maxSessionsPerDay: 8 },
    },
  };
}

// Line 558: Hardcoded default duration
value={avail.sessionSettings?.defaultDuration || 60}
```

**Backend API:** `GET /api/v1/consultant-settings/:consultantId` (should return defaults)
**Priority:** MEDIUM

---

### 3.5 **Payment Status Filters**

#### **Page:** `Consultant/src/pages/ClientPayments.tsx`

**Hardcoded Data:**
```typescript
// Lines 256-258: Incomplete status filter
<SelectItem value="All Payments">All Payments</SelectItem>
<SelectItem value="Completed">Completed</SelectItem>
// Missing: Pending, Failed, Refunded
```

**Backend API:** Transaction model has status enum - should use it
**Priority:** MEDIUM

---

### 3.6 **Chart Colors**

#### **Page:** `Consultation_Admin/src/pages/Dashboard.tsx`

**Hardcoded Data:**
```typescript
// Lines 159-166: Chart colors
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];
```

**Backend API:** Could be in theme config
**Priority:** LOW

---

### 3.7 **Pagination Options**

#### **Page:** `Consultant/src/pages/ClientManagement.tsx`

**Hardcoded Data:**
```typescript
// Lines 813-815: Pagination sizes
<SelectItem value="10">10</SelectItem>
<SelectItem value="20">20</SelectItem>
<SelectItem value="50">50</SelectItem>
```

**Backend API:** Could be configurable
**Priority:** LOW

---

### 3.8 **Status Enums (Multiple Files)**

**Hardcoded Status Arrays:**
```typescript
// ClientBookings.tsx (Lines 477-478)
["Upcoming", "Confirmed", "Pending"] // upcoming
["Completed", "Cancelled"] // past

// Consultant_ClientProfile.tsx (Lines 597-598)
["Upcoming", "Confirmed", "Pending"] // upcoming
["Completed", "Cancelled"] // past
```

**Backend API:** Appointment model has status enum - should use constants
**Priority:** MEDIUM

---

## 📋 Part 4: Removal Plan

### Phase 1: Create Shared Utilities (Week 1)

#### 1.1 Create Date/Time Utilities
**File:** `Consultant/src/utils/dateTimeUtils.ts`
**File:** `Consultation_Admin/src/utils/dateTimeUtils.ts`

**Functions to extract:**
- `normalizeTimeString(t: string)`
- `parseSlotToRange(date: Date, slot: string, durationMin = 60)`
- `formatHHMM(d: Date)`
- `isoDateOnly(date: Date)`
- `formatDateLine(date, start, end, session)`
- `formatDate(dateString: string | Date)`
- `checkIsNow(dateStr, timeStart, timeEnd)`

**Action Items:**
1. Create utility files
2. Move functions from pages
3. Update imports in all files
4. Test all date/time operations

---

#### 1.2 Create String Utilities
**File:** `Consultant/src/utils/stringUtils.ts`

**Functions to extract:**
- `normalize(s: string)` - For search normalization
- `filterPayments(items, q)` - Payment filtering
- `filterDocs(docs, q, cat)` - Document filtering

**Action Items:**
1. Create utility file
2. Move functions
3. Update imports

---

#### 1.3 Create Constants File
**File:** `Consultant/src/constants/appConstants.ts`
**File:** `Consultation_Admin/src/constants/appConstants.ts`

**Constants to extract:**
```typescript
export const APPOINTMENT_STATUSES = {
  UPCOMING: "Upcoming",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const TRANSACTION_STATUSES = {
  PENDING: "Pending",
  SUCCESS: "Success",
  FAILED: "Failed",
  REFUNDED: "Refunded",
} as const;

export const DOCUMENT_TYPES = {
  MEDICAL_REPORT: "Medical Report",
  CONSULTATION_NOTES: "Consultation Notes",
  PRESCRIPTION: "Prescription",
  INVOICE: "Invoice",
} as const;

export const PAGINATION_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 8;
export const DEFAULT_SESSION_DURATION = 60; // minutes
export const DEFAULT_BUFFER_TIME = 15; // minutes
export const DEFAULT_MAX_SESSIONS_PER_DAY = 8;
```

**Action Items:**
1. Create constants files
2. Replace hardcoded arrays with constants
3. Update all files using these values

---

#### 1.4 Create Data Transformers
**File:** `Consultant/src/utils/dataTransformers.ts`

**Functions to extract:**
- `transformTransactionToPaymentItem(transaction)`
- `transformAppointmentToUI(appointment)`
- `transformConsultantToCard(consultant)`

**Action Items:**
1. Create transformer utilities
2. Move mapping logic
3. Update components

---

#### 1.5 Create Custom Hooks
**Files:**
- `Consultant/src/hooks/useUsers.ts`
- `Consultant/src/hooks/useConsultants.ts`
- `Consultant/src/hooks/useCategories.ts`
- `Consultant/src/hooks/useAppointments.ts`

**Action Items:**
1. Create custom hooks
2. Extract query logic
3. Replace inline queries

---

### Phase 2: Backend API Enhancements (Week 2)

#### 2.1 Document Management API
**New Endpoints:**
```
GET    /api/v1/documents                    - List documents
POST   /api/v1/documents                    - Upload document
GET    /api/v1/documents/:id                 - Get document
DELETE /api/v1/documents/:id                 - Delete document
GET    /api/v1/document-types                - Get document types (configurable)
```

**Backend Tasks:**
1. Create Document model
2. Create document controller
3. Create document routes
4. Add file upload middleware
5. Add document type configuration

---

#### 2.2 Enhanced Analytics API
**Update Endpoints:**
```
GET /api/v1/analytics/consultant
Response should include:
- monthlyRevenue: Array of 6 months with revenue
- weeklyAppointments: Array of 7 days
- performance: { sessionCompletion, avgRating, responseTime, rebookingRate }
- summary: { monthlyRevenue, activeConsultants, totalAppointments }
```

```
GET /api/v1/analytics/overview
Response should include:
- categoryPerformance: Array with revenue, sessions, rates, growth
- topConsultants: Array with rankings
- monthlyTrends: Array of 6 months with revenue and appointments
```

**Backend Tasks:**
1. Update analytics controller
2. Add aggregation queries
3. Calculate growth percentages
4. Return structured data

---

#### 2.3 Configuration API
**New Endpoint:**
```
GET /api/v1/config
Response:
{
  documentTypes: [...],
  defaultSettings: {...},
  paginationOptions: [...],
  chartColors: [...],
  uiConfig: {...}
}
```

**Backend Tasks:**
1. Create config controller
2. Store configuration in database or env
3. Return configuration object

---

### Phase 3: Remove Hardcoded Data (Week 3)

#### 3.1 Analytics Pages
**Files:**
- `Consultant/src/pages/Analytics.tsx`
- `Consultation_Admin/src/pages/Analytics.tsx`

**Actions:**
1. Remove hardcoded arrays
2. Use `useQuery` to fetch from enhanced analytics API
3. Handle loading/error states
4. Update UI to use real data

---

#### 3.2 Documents Pages
**Files:**
- `Consultant/src/pages/ClientDocuments.tsx`
- `Consultant/src/pages/Consultant_ClientProfile.tsx`

**Actions:**
1. Remove `DOCS` array
2. Create `useDocuments` hook
3. Fetch documents from API
4. Fetch document types from API
5. Update document type dropdowns

---

#### 3.3 Client Dashboard
**File:** `Consultation_Admin/src/pages/ClientDashboard.tsx`

**Actions:**
1. Remove hardcoded statistics
2. Use `GET /api/v1/analytics/client`
3. Remove mock appointments
4. Fetch real appointments

---

#### 3.4 Settings Page
**File:** `Consultant/src/pages/Settings.tsx`

**Actions:**
1. Remove `defaultSettings()` function
2. Fetch defaults from backend
3. Use API defaults if settings don't exist

---

#### 3.5 Payment Filters
**File:** `Consultant/src/pages/ClientPayments.tsx`

**Actions:**
1. Generate filter options from `TRANSACTION_STATUSES` constant
2. Remove hardcoded filter options

---

### Phase 4: Code Refactoring (Week 4)

#### 4.1 Break Down Large Components
**Target Files:**
- `AppointmentManagement.tsx` (1143 lines) → Split into:
  - `AppointmentList.tsx`
  - `AppointmentFilters.tsx`
  - `AppointmentModals.tsx`
  - `useAppointments.ts` hook

- `Consultant_Profile.tsx` (1705 lines) → Split into:
  - `ProfileHeader.tsx`
  - `ProfileTabs.tsx`
  - `EducationSection.tsx`
  - `ExperienceSection.tsx`
  - `useProfile.ts` hook

- `Consultant_ClientProfile.tsx` (1366 lines) → Split into:
  - `ClientProfileHeader.tsx`
  - `ClientTabs.tsx`
  - `BookingsTab.tsx`
  - `DocumentsTab.tsx`
  - `PaymentsTab.tsx`

**Action Items:**
1. Identify logical component boundaries
2. Extract sub-components
3. Create custom hooks for logic
4. Update imports
5. Test each component

---

#### 4.2 Extract Inline Transformations
**Actions:**
1. Move `mappedAppointments` to transformer function
2. Move `mappedTransactions` to transformer function
3. Create reusable transformers
4. Update components to use transformers

---

#### 4.3 Consolidate Duplicate Code
**Actions:**
1. Remove duplicate `DOCS` array (keep in one place)
2. Remove duplicate `typeBadgeCls` (move to theme)
3. Remove duplicate filter functions
4. Remove duplicate error handlers

---

## 📊 Summary Statistics

### Redundancy:
- **Duplicate Functions:** 8 types
- **Total Duplicate Instances:** 20+
- **Lines of Duplicate Code:** ~500+

### Hardcoded Data:
- **Analytics Data:** 2 files (CRITICAL)
- **Document Data:** 2 files (CRITICAL)
- **Mock Appointments:** 1 file (HIGH)
- **Settings Defaults:** 1 file (MEDIUM)
- **Status Enums:** Multiple files (MEDIUM)
- **Configuration Values:** Multiple files (LOW)

### Scalability Issues:
- **Large Components:** 4 files (>1000 lines each)
- **Inline Transformations:** 10+ locations
- **Repeated Query Logic:** 15+ locations
- **Magic Numbers:** 20+ instances

---

## ✅ Success Criteria

1. ✅ All duplicate functions consolidated
2. ✅ All hardcoded data removed
3. ✅ All large components broken down (<500 lines)
4. ✅ All data transformations extracted
5. ✅ All constants in shared file
6. ✅ All API endpoints created/enhanced
7. ✅ All components use real backend data
8. ✅ Code coverage maintained/improved

---

## 🚀 Implementation Priority

### Week 1: Foundation
- Create shared utilities
- Create constants file
- Extract duplicate functions

### Week 2: Backend
- Create document management API
- Enhance analytics APIs
- Create configuration API

### Week 3: Frontend Integration
- Remove hardcoded analytics data
- Remove hardcoded documents
- Integrate real APIs

### Week 4: Refactoring
- Break down large components
- Extract transformations
- Final cleanup

---

This plan provides a systematic approach to eliminate redundancy and hardcoded data while improving code maintainability and scalability.

