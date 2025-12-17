# Implementation Plan - Remove Hardcoded Data & Redundancy

## 📋 Overview

This document provides a step-by-step implementation plan to:
1. Remove all hardcoded data from frontend
2. Eliminate redundant functions
3. Improve code scalability
4. Enhance backend APIs

**Estimated Timeline:** 4 weeks
**Priority Order:** Critical → High → Medium → Low

---

## 🚀 Week 1: Foundation & Utilities

### Day 1-2: Create Shared Utilities

#### Task 1.1: Date/Time Utilities
**File:** `Consultant/src/utils/dateTimeUtils.ts`
**File:** `Consultation_Admin/src/utils/dateTimeUtils.ts`

```typescript
// Functions to extract:
export function normalizeTimeString(t: string): string
export function parseSlotToRange(date: Date, slot: string, durationMin?: number): { start: Date, end: Date }
export function formatHHMM(d: Date): string
export function isoDateOnly(date: Date): string
export function formatDateLine(date: string, start: string, end: string, session: string): string
export function formatDate(dateString: string | Date): string
export function checkIsNow(dateStr?: string, timeStart?: string, timeEnd?: string): boolean
```

**Files to Update:**
- `Consultant/src/pages/AppointmentManagement.tsx`
- `Consultant/src/pages/ClientBookings.tsx`
- `Consultation_Admin/src/pages/AppointmentManagement.tsx`
- `Consultant/src/pages/Consultant_ClientProfile.tsx`
- `Consultant/src/pages/ClientManagement.tsx`

**Steps:**
1. Create utility files
2. Copy functions from pages
3. Add TypeScript types
4. Add JSDoc comments
5. Update imports in all files
6. Test each function
7. Remove duplicate functions from pages

---

#### Task 1.2: String Utilities
**File:** `Consultant/src/utils/stringUtils.ts`

```typescript
// Functions to extract:
export function normalize(s: string): string
export function filterPayments(items: PaymentItem[], q: string): PaymentItem[]
export function filterDocs(docs: DocItem[], q: string, cat: string): DocItem[]
```

**Files to Update:**
- `Consultant/src/pages/ClientDocuments.tsx`
- `Consultant/src/pages/ClientPayments.tsx`
- `Consultant/src/pages/Consultant_ClientProfile.tsx`

**Steps:**
1. Create utility file
2. Move functions
3. Update imports
4. Test filtering

---

#### Task 1.3: Constants File
**File:** `Consultant/src/constants/appConstants.ts`
**File:** `Consultation_Admin/src/constants/appConstants.ts`

```typescript
// Appointment Statuses
export const APPOINTMENT_STATUSES = {
  UPCOMING: "Upcoming",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const APPOINTMENT_STATUS_ARRAY = Object.values(APPOINTMENT_STATUSES);

export const UPCOMING_STATUSES = [
  APPOINTMENT_STATUSES.UPCOMING,
  APPOINTMENT_STATUSES.CONFIRMED,
  "Pending" // Legacy support
] as const;

export const PAST_STATUSES = [
  APPOINTMENT_STATUSES.COMPLETED,
  APPOINTMENT_STATUSES.CANCELLED
] as const;

// Transaction Statuses
export const TRANSACTION_STATUSES = {
  PENDING: "Pending",
  SUCCESS: "Success",
  FAILED: "Failed",
  REFUNDED: "Refunded",
} as const;

export const TRANSACTION_STATUS_ARRAY = Object.values(TRANSACTION_STATUSES);

// Document Types (will be replaced with API)
export const DOCUMENT_TYPES = {
  MEDICAL_REPORT: "Medical Report",
  CONSULTATION_NOTES: "Consultation Notes",
  PRESCRIPTION: "Prescription",
  INVOICE: "Invoice",
} as const;

// Configuration
export const PAGINATION_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 8;
export const DEFAULT_SESSION_DURATION = 60; // minutes
export const DEFAULT_BUFFER_TIME = 15; // minutes
export const DEFAULT_MAX_SESSIONS_PER_DAY = 8;
export const DEBOUNCE_DELAY = 300; // ms
export const OTP_TIMER = 30; // seconds
```

**Files to Update:**
- All files using hardcoded status arrays
- All files using magic numbers

**Steps:**
1. Create constants files
2. Define all constants
3. Replace hardcoded arrays
4. Replace magic numbers
5. Update type definitions

---

### Day 3-4: Create Data Transformers

#### Task 1.4: Transaction Transformers
**File:** `Consultant/src/utils/dataTransformers.ts`

```typescript
export function transformTransactionToPaymentItem(t: any): PaymentItem {
  return {
    id: t._id,
    initials: new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    doctor: t.consultantSnapshot?.name || "Unknown",
    dept: t.consultantSnapshot?.category || "General",
    status: t.status,
    title: `${t.consultantSnapshot?.subcategory || "General"} • ${t.appointment?.reason || "Consultation"}`,
    date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    method: t.paymentMethod,
    txn: t.transactionId || "N/A",
    invoice: t.metadata?.invoiceId || "N/A",
    price: t.amount || 0,
    session: t.appointment?.session || "Video Call",
  };
}
```

**Files to Update:**
- `Consultant/src/pages/ClientPayments.tsx`
- `Consultant/src/pages/Consultant_ClientProfile.tsx`

---

#### Task 1.5: Appointment Transformers
**File:** `Consultant/src/utils/dataTransformers.ts`

```typescript
export function transformAppointmentToUI(appointment: any, currentUser: any): Appointment {
  // Extract transformation logic from AppointmentManagement.tsx
}
```

---

### Day 5: Create Custom Hooks

#### Task 1.6: Custom Query Hooks
**Files:**
- `Consultant/src/hooks/useUsers.ts`
- `Consultant/src/hooks/useConsultants.ts`
- `Consultant/src/hooks/useCategories.ts`
- `Consultant/src/hooks/useAppointments.ts`
- `Consultant/src/hooks/useDocuments.ts` (for future use)

**Example:**
```typescript
// useUsers.ts
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => UserAPI.getAllUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## 🔧 Week 2: Backend API Development

### Day 1-3: Document Management API

#### Task 2.1: Create Document Model
**File:** `backend/src/models/document.model.js`

```javascript
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["Medical Report", "Consultation Notes", "Prescription", "Invoice"], required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  consultant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
```

---

#### Task 2.2: Create Document Controller
**File:** `backend/src/api/v1/controllers/document.controller.js`

**Endpoints:**
- `GET /api/v1/documents` - List documents (with filters)
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents/:id` - Get document
- `DELETE /api/v1/documents/:id` - Delete document

---

#### Task 2.3: Create Document Routes
**File:** `backend/src/api/v1/routes/document.routes.js`

---

#### Task 2.4: Document Type Configuration
**Option 1:** Store in AdminSettings
**Option 2:** Create separate DocumentType model
**Option 3:** Return from config endpoint

**Endpoint:** `GET /api/v1/document-types`

---

### Day 4-5: Enhance Analytics APIs

#### Task 2.5: Enhance Consultant Analytics
**File:** `backend/src/api/v1/controllers/analytics.controller.js`

**Update:** `exports.consultantStats`

**Add to Response:**
```javascript
{
  stats: [...], // existing
  monthlyRevenue: [
    { name: "May", revenue: 220000 },
    // ... 5 more months
  ],
  weeklyAppointments: [8, 12, 10, 16, 12, 7, 3],
  performance: {
    sessionCompletion: 96,
    avgRating: 4.8,
    responseTime: 2,
    rebookingRate: 78,
  },
  summary: {
    monthlyRevenue: 380000,
    activeConsultants: 24,
    totalAppointments: 1240,
  }
}
```

**Implementation:**
1. Add aggregation queries for monthly revenue
2. Calculate weekly appointment breakdown
3. Calculate performance metrics
4. Return structured response

---

#### Task 2.6: Enhance Admin Analytics
**File:** `backend/src/api/v1/controllers/analytics.controller.js`

**Update:** `exports.overview`

**Add to Response:**
```javascript
{
  cards: {...}, // existing
  topCategories: [...], // existing
  recentAppointments: [...], // existing
  categoryPerformance: [
    {
      name: "Legal",
      revenue: 65000,
      sessions: 87,
      rate: "₹300/hr avg",
      growth: "+15%"
    },
    // ... more categories
  ],
  topConsultants: [
    {
      rank: 1,
      name: "Lisa Johnson",
      category: "Legal",
      rating: 4.9,
      sessions: 75,
      revenue: 22500
    },
    // ... top 5
  ],
  monthlyTrends: [
    { name: "Jan", revenue: 85000, appt: 245 },
    // ... 6 months
  ]
}
```

**Implementation:**
1. Aggregate category performance
2. Calculate top consultants
3. Calculate monthly trends
4. Calculate growth percentages

---

## 🎨 Week 3: Frontend Integration

### Day 1-2: Remove Analytics Hardcoded Data

#### Task 3.1: Update Consultant Analytics Page
**File:** `Consultant/src/pages/Analytics.tsx`

**Steps:**
1. Remove hardcoded `months` array
2. Remove hardcoded `weeklyAppointments` array
3. Remove hardcoded `performance` object
4. Add `useQuery` to fetch from enhanced API
5. Update UI to use real data
6. Add loading states
7. Add error handling
8. Remove hardcoded summary values

**Code Changes:**
```typescript
// Before
const months = [{ name: "May", revenue: 220000 }, ...];

// After
const { data: analyticsData, isLoading } = useQuery({
  queryKey: ["consultant-analytics"],
  queryFn: () => DashboardAPI.getConsultantStats(),
});

const months = analyticsData?.data?.monthlyRevenue || [];
```

---

#### Task 3.2: Update Admin Analytics Page
**File:** `Consultation_Admin/src/pages/Analytics.tsx`

**Steps:**
1. Remove hardcoded `categoryData` array
2. Remove hardcoded `consultants` array
3. Remove hardcoded `months` array
4. Add `useQuery` to fetch from enhanced API
5. Update UI to use real data
6. Add loading/error states

---

### Day 3-4: Remove Document Hardcoded Data

#### Task 3.3: Update ClientDocuments Page
**File:** `Consultant/src/pages/ClientDocuments.tsx`

**Steps:**
1. Remove `DOCS` array (lines 43-89)
2. Remove `typeBadgeCls` (move to theme/constants)
3. Create `useDocuments` hook
4. Fetch documents from API
5. Fetch document types from API
6. Update document type dropdown to use API data
7. Add loading/error states
8. Add empty state

**Code Changes:**
```typescript
// Before
const DOCS: DocItem[] = [{ id: "1", ... }, ...];
const [items, setItems] = useState(DOCS);

// After
const { data: documentsData, isLoading } = useQuery({
  queryKey: ["documents"],
  queryFn: () => DocumentAPI.getAll(),
});

const items = documentsData?.data || [];
```

---

#### Task 3.4: Update Consultant_ClientProfile Page
**File:** `Consultant/src/pages/Consultant_ClientProfile.tsx`

**Steps:**
1. Remove duplicate `DOCS` array (lines 801-847)
2. Remove duplicate `typeBadgeCls` (lines 848-853)
3. Use same `useDocuments` hook
4. Update document type dropdown
5. Remove duplicate code

---

### Day 5: Update Other Pages

#### Task 3.5: Update Client Dashboard
**File:** `Consultation_Admin/src/pages/ClientDashboard.tsx`

**Steps:**
1. Remove hardcoded statistics (lines 33-36)
2. Fetch from `GET /api/v1/analytics/client`
3. Remove mock appointments (lines 198-231)
4. Fetch real appointments
5. Update UI

---

#### Task 3.6: Update Settings Page
**File:** `Consultant/src/pages/Settings.tsx`

**Steps:**
1. Remove `defaultSettings()` function
2. Fetch defaults from backend
3. Use API defaults if settings don't exist
4. Update default duration to use constant

---

#### Task 3.7: Update Payment Filters
**File:** `Consultant/src/pages/ClientPayments.tsx`

**Steps:**
1. Import `TRANSACTION_STATUS_ARRAY` from constants
2. Generate filter options dynamically
3. Remove hardcoded filter options

**Code Changes:**
```typescript
// Before
<SelectItem value="All Payments">All Payments</SelectItem>
<SelectItem value="Completed">Completed</SelectItem>

// After
<SelectItem value="All Payments">All Payments</SelectItem>
{TRANSACTION_STATUS_ARRAY.map(status => (
  <SelectItem key={status} value={status}>{status}</SelectItem>
))}
```

---

## 🔄 Week 4: Refactoring & Cleanup

### Day 1-2: Break Down Large Components

#### Task 4.1: Refactor AppointmentManagement
**File:** `Consultant/src/pages/AppointmentManagement.tsx` (1143 lines)

**Split Into:**
- `components/appointments/AppointmentList.tsx` (~200 lines)
- `components/appointments/AppointmentFilters.tsx` (~150 lines)
- `components/appointments/AppointmentModals.tsx` (~300 lines)
- `hooks/useAppointments.ts` (~200 lines)
- `pages/AppointmentManagement.tsx` (~300 lines - orchestrator)

**Steps:**
1. Identify component boundaries
2. Extract AppointmentList component
3. Extract AppointmentFilters component
4. Extract modal components
5. Extract useAppointments hook
6. Update main component to use extracted pieces
7. Test each component

---

#### Task 4.2: Refactor Consultant_Profile
**File:** `Consultant/src/pages/Consultant_Profile.tsx` (1705 lines)

**Split Into:**
- `components/profile/ProfileHeader.tsx`
- `components/profile/ProfileTabs.tsx`
- `components/profile/EducationSection.tsx`
- `components/profile/ExperienceSection.tsx`
- `components/profile/AwardsSection.tsx`
- `hooks/useProfile.ts`
- `pages/Consultant_Profile.tsx` (orchestrator)

---

#### Task 4.3: Refactor Consultant_ClientProfile
**File:** `Consultant/src/pages/Consultant_ClientProfile.tsx` (1366 lines)

**Split Into:**
- `components/client/ClientProfileHeader.tsx`
- `components/client/ClientTabs.tsx`
- `components/client/BookingsTab.tsx`
- `components/client/DocumentsTab.tsx`
- `components/client/PaymentsTab.tsx`
- `pages/Consultant_ClientProfile.tsx` (orchestrator)

---

### Day 3: Extract Inline Transformations

#### Task 4.4: Move Transformations to Utilities
**Steps:**
1. Move `mappedAppointments` logic to transformer
2. Move `mappedTransactions` logic to transformer
3. Update all components to use transformers
4. Test transformations

---

### Day 4: Final Cleanup

#### Task 4.5: Remove All Duplicates
**Steps:**
1. Remove duplicate `normalizeTimeString` functions
2. Remove duplicate `parseSlotToRange` functions
3. Remove duplicate `formatDateLine` functions
4. Remove duplicate `normalize` functions
5. Remove duplicate `filterPayments` functions
6. Remove duplicate error handlers
7. Verify all imports updated

---

#### Task 4.6: Update All Status Arrays
**Steps:**
1. Find all hardcoded status arrays
2. Replace with constants
3. Update type definitions
4. Test filtering logic

---

### Day 5: Testing & Documentation

#### Task 4.7: Comprehensive Testing
**Steps:**
1. Test all date/time utilities
2. Test all data transformations
3. Test all API integrations
4. Test all filters
5. Test all components
6. Fix any bugs

---

#### Task 4.8: Update Documentation
**Steps:**
1. Update README files
2. Document new utilities
3. Document new APIs
4. Update feature lists
5. Create migration guide

---

## ✅ Verification Checklist

### Week 1 Completion:
- [ ] All utility files created
- [ ] All duplicate functions removed
- [ ] Constants file created
- [ ] All imports updated
- [ ] All tests passing

### Week 2 Completion:
- [ ] Document API created and tested
- [ ] Analytics APIs enhanced
- [ ] All endpoints documented
- [ ] Backend tests passing

### Week 3 Completion:
- [ ] All hardcoded analytics data removed
- [ ] All hardcoded documents removed
- [ ] All pages using real APIs
- [ ] Loading/error states added
- [ ] All tests passing

### Week 4 Completion:
- [ ] Large components broken down
- [ ] All transformations extracted
- [ ] All duplicates removed
- [ ] Code coverage maintained
- [ ] Documentation updated

---

## 📊 Success Metrics

1. **Code Reduction:**
   - Remove ~500+ lines of duplicate code
   - Remove ~300+ lines of hardcoded data
   - Total reduction: ~800+ lines

2. **Maintainability:**
   - All large components <500 lines
   - All utilities in shared files
   - All constants centralized

3. **API Coverage:**
   - 100% of hardcoded data replaced with APIs
   - All new endpoints documented
   - All endpoints tested

4. **Code Quality:**
   - No duplicate functions
   - No hardcoded data
   - Consistent patterns
   - Better testability

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Test each change incrementally
- Keep old code commented during transition
- Use feature flags if needed

### Risk 2: API Performance
**Mitigation:**
- Add caching to analytics queries
- Optimize database queries
- Add pagination where needed

### Risk 3: Missing Data
**Mitigation:**
- Add fallback values
- Handle empty states gracefully
- Add loading indicators

---

This implementation plan provides a clear roadmap to eliminate all hardcoded data and redundancy while improving code quality and maintainability.

