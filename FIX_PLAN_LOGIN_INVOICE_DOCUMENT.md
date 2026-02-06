# Fix Plan: Login Role, Invoice History & Document Upload

**Created:** Feb 4, 2025  
**Scope:** 3 bugs in Consultant portal + backend

---

## Overview

| # | Issue | Root Cause | Priority |
|---|-------|------------|----------|
| 1 | Login API returns Consultant when Client logs in | `requestedRole` ignored; lookup order always Consultant → Client | High |
| 2 | Consultant invoice/payment history wrong/empty | Transaction stores User ID; Consultant JWT has Consultant ID | High |
| 3 | Document upload "validation type failed" | Strict `fileUrl` URI validation or missing/invalid fields | Medium |

---

## Issue 1: Login API – Role Mismatch

### Goal
When user selects "Client" and logs in with email/password, response must return `role: "Client"`. Same for Consultant.

### Files to Change
- `backend/src/api/v1/controllers/auth.controller.js`

### Plan

1. **Use `requestedRole` to determine lookup order**
   - If `requestedRole === "Client"` → check Client model first, then Consultant, then User
   - If `requestedRole === "Consultant"` → check Consultant model first, then Client, then User
   - If `requestedRole` is missing/undefined → keep current order (Consultant → Client → User) for backward compatibility

2. **Enforce role match**
   - After finding user, if `requestedRole` was provided and does not match the found account's role, reject with: `"Invalid credentials or role mismatch"`

3. **Implementation steps**
   - Extract `requestedRole` from `req.body` (already done)
   - Refactor lookup into a helper or conditional block based on `requestedRole`
   - Add post-match check: if `requestedRole` exists and `role !== requestedRole`, throw `ApiError`

### Assumptions
- Frontend sends `role: "Client"` or `role: "Consultant"` in login payload (already does per `Login.tsx`)
- Same email in both Consultant and Client collections is an edge case; we resolve by respecting user's role selection

---

## Issue 2: Invoice/Transaction History – Wrong Data for Consultant

### Goal
Consultant sees correct transaction/invoice history when logged in via Consultant model.

### Files to Change
- `backend/src/api/v1/controllers/transaction.controller.js`
- `backend/src/models/consultant.model.js` (reference only – to understand `user` link)

### Plan

1. **Expand consultant query for Consultant role**
   - When `req.user.role === "Consultant"`, `userId = req.user.id` is Consultant._id
   - Transactions may have `consultant: User._id` (when consultant has linked User) or `consultant: Consultant._id`
   - Resolve both: find Consultant by `userId`, get `consultant.user` (linked User ID)
   - Build query: `$or: [{ consultant: userId }, { consultant: linkedUserId }]` (exclude null)

2. **Implementation steps**
   - At start of `getTransactions`, if `req.user.role === "Consultant"`:
     - `consultantId = req.user.id`
     - Fetch `Consultant.findById(consultantId).select("user").lean()`
     - Collect IDs: `[consultantId]`; if `consultant.user` exists, add it
     - Set `query = { $or: consultantIds.map(id => ({ consultant: id })) }` for consultant-only view
   - For Client: keep `query = { user: userId }` (Client ID matches `transaction.user`)
   - For Admin with `consultant` param: keep existing logic

3. **Edge cases**
   - Consultant with no linked User: only `Consultant._id` in query
   - Consultant with linked User: both IDs in query
   - Ensure no duplicate transactions when both IDs match same transaction (use `$or` with distinct IDs)

### Assumptions
- Transaction model stores `consultant` as either User._id or Consultant._id (confirmed in appointment flow)
- Client-side `transaction.user` is Client._id; no User linking for Client in this flow

---

## Issue 3: Document Upload – Validation Type Failed

### Goal
Document upload from Consultant (and Client) succeeds without validation errors.

### Files to Change
- `backend/src/api/v1/validators/document.validator.js`
- `Consultant/src/pages/Consultant_ClientProfile.tsx` (optional – add type selector if needed)

### Plan

1. **Relax `fileUrl` validation**
   - Current: `Joi.string().uri().required()` – can fail on Cloudinary/S3 URLs with special chars
   - Change to: `Joi.string().min(10).pattern(/^https?:\/\//).required()` or `Joi.string().uri({ scheme: ['http', 'https'], allowRelative: false })`
   - Ensure we still block empty and non-URL strings

2. **Make `client`/`consultant` validation role-aware**
   - Controller already derives them from `req.user` when missing
   - Validator: keep both optional; add `.allow("")` if frontend sends empty string
   - Ensure ObjectId pattern allows 24-char hex only when value is present

3. **Add type selector in Consultant upload modal (optional)**
   - Consultant modal currently uses default `"Medical Report"`
   - Add dropdown with: Medical Report, Consultation Notes, Prescription, Invoice, Lab Results, Treatment Plan, Other
   - Ensures `type` is always valid and explicit

4. **Improve error response**
   - Validation middleware already returns `errors` array with field + message
   - Ensure frontend displays `errors[0].message` or similar for better debugging

### Implementation steps
- Update `createDocumentSchema` in `document.validator.js`:
  - Replace `fileUrl: Joi.string().uri().required()` with more permissive rule
  - Optionally relax `client`/`consultant` to `.allow("")` if needed
- (Optional) Add type dropdown in `Consultant_ClientProfile.tsx` DocumentsTab upload modal

### Assumptions
- Cloudinary/S3 returns `https://` URLs
- Document types enum is fixed; no new types without schema change

---

## Execution Order

| Step | Task | Dependency |
|------|------|-------------|
| 1 | Fix Login API (auth.controller.js) | None |
| 2 | Fix Transaction query (transaction.controller.js) | None |
| 3 | Fix Document validator (document.validator.js) | None |
| 4 | (Optional) Add type selector in Consultant upload modal | Step 3 |

Steps 1–3 can be done in parallel.

---

## Testing Checklist

### Issue 1 – Login
- [ ] Client selects "Client", logs in with client email → receives `role: "Client"`
- [ ] Consultant selects "Consultant", logs in with consultant email → receives `role: "Consultant"`
- [ ] Client email used with "Consultant" selected → rejected (role mismatch)
- [ ] Consultant email used with "Client" selected → rejected (role mismatch)
- [ ] Login without role (legacy) → still works (Consultant → Client → User order)

### Issue 2 – Invoice History
- [ ] Consultant with linked User sees their transactions
- [ ] Consultant without linked User sees their transactions
- [ ] Client sees only their transactions
- [ ] Admin with `consultant` param sees that consultant's transactions

### Issue 3 – Document Upload
- [ ] Consultant uploads document from Client Profile → success
- [ ] Client uploads document → success
- [ ] Invalid fileUrl format → clear validation error
- [ ] (If type selector added) All document types can be selected and saved

---

## Rollback

- All changes are in isolated files; revert via git if needed
- No DB migrations required
- No env var changes

---

## Commit Message (Suggested)

```
fix(auth,transactions,documents): resolve login role, invoice history, and document upload validation

- auth: use requestedRole to determine lookup order and enforce role match
- transactions: include linked User ID when querying for Consultant
- documents: relax fileUrl validation for Cloudinary/S3 URLs
```
