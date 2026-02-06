# Security & Compliance Remediation Plan

**Product:** Consultation Platform (Consultant + Admin + Backend)  
**Scope:** Security hardening, GDPR, HIPAA readiness  
**Created:** Feb 5, 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase 1: Critical Security Fixes (Week 1)](#2-phase-1-critical-security-fixes-week-1)
3. [Phase 2: High-Priority Security (Week 2)](#3-phase-2-high-priority-security-week-2)
4. [Phase 3: Medium-Priority Security (Week 2–3)](#4-phase-3-medium-priority-security-week-2-3)
5. [Phase 4: GDPR Compliance (Weeks 3–4)](#5-phase-4-gdpr-compliance-weeks-34)
6. [Phase 5: HIPAA Readiness (Weeks 5–6)](#6-phase-5-hipaa-readiness-weeks-56)
7. [Phase 6: Operational & Process (Ongoing)](#7-phase-6-operational--process-ongoing)
8. [Appendix: File Reference](#8-appendix-file-reference)
7. [Appendix: File Reference](#7-appendix-file-reference)

---

## 1. Executive Summary

| Category | Current State | Target |
|----------|---------------|--------|
| **Security** | ~50% | Production-ready |
| **GDPR** | ~35% | Compliant |
| **HIPAA** | ~20% | BAA-ready if healthcare |

**Critical vulnerabilities:** 4 | **High:** 6 | **Medium:** 8

---

## 2. Phase 1: Critical Security Fixes (Week 1)

### Step 1.1: Fix OTP Exposure (P0)

**Problem:** OTP returned in API response and logged in plain text.

**Files:**
- `backend/src/api/v1/controllers/auth.controller.js`

**Actions:**

1. **Remove OTP from API response** (line ~62)
   - Change: `return sendSuccess(res, "OTP sent successfully", { otp });`
   - To: `return sendSuccess(res, "OTP sent successfully");` (no data, or `{ sent: true }`)
   - In production, OTP must only be sent via SMS/email, never in API response.

2. **Remove OTP from logs** (lines ~60, ~107, ~111)
   - Remove: `console.log(\`🔐 OTP for ${mobile}: ${otp}\`);`
   - Remove: `console.log(\`🔍 Verifying OTP - Mobile: ${mobile}, OTP: ${otp}...\`);`
   - Replace with: `logger.debug('OTP sent', { mobile: mobile.slice(-4) });` (log last 4 digits only for debugging, or nothing in prod)

3. **Dev-only OTP return** (optional)
   - If you need OTP in dev for testing without SMS: `if (process.env.NODE_ENV === 'development' && process.env.ALLOW_OTP_IN_RESPONSE === 'true') { return sendSuccess(res, "OTP sent", { otp }); }`
   - Never enable in production.

---

### Step 1.2: Enable Rate Limiting (P0)

**Problem:** Rate limiter is commented out; enables brute force and OTP abuse.

**Files:**
- `backend/src/app.js`

**Actions:**

1. Uncomment and configure rate limiter:
   ```javascript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100,
     message: { success: false, message: "Too many requests" },
     standardHeaders: true,
     legacyHeaders: false,
   });
   app.use("/api/v1", limiter);
   ```

2. Add stricter limit for auth routes:
   ```javascript
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10, // 10 attempts per 15 min for login/send-otp
   });
   router.use("/auth/login", authLimiter);
   router.use("/auth/send-otp", authLimiter);
   ```

---

### Step 1.3: Fix Storage Proxy – Unauthenticated File Access (P0)

**Problem:** `GET /api/v1/storage/proxy?key=...` has no authentication. Anyone can download files by guessing S3 keys.

**Files:**
- `backend/src/api/v1/routes/storage.routes.js`
- `backend/src/api/v1/controllers/storage.controller.js`

**Actions:**

1. Add `authenticateToken` to storage routes.
2. Validate that the requesting user owns the file:
   - Parse `key` (e.g. `users/{userId}/documents/...` or `invoices/...`).
   - For `users/{userId}/...`: ensure `req.user.id === userId` or user is Admin.
   - For `invoices/`: ensure user is Admin, Consultant (own invoices), or Client (own invoices).
3. Add path traversal check: reject `key` containing `..` or `%2e%2e`.
4. Reject keys that don’t match allowed patterns.

---

### Step 1.4: Fix Document IDOR – Client Filter Override (P0)

**Problem:** In `document.controller.js` getAll, a Client can pass `?client=otherClientId` and override `filter.client`, potentially viewing other clients’ documents.

**Files:**
- `backend/src/api/v1/controllers/document.controller.js`

**Actions:**

1. Apply `client` and `consultant` query filters only for Admin (and optionally Consultant for their own data):
   ```javascript
   if (userRole === "Client") {
     filter.client = userId;
     // Do NOT allow client to override with query param
   } else if (userRole === "Consultant") {
     filter.consultant = userId;
     if (client) filter.client = client; // Consultant can filter by client
   } else if (userRole === "Admin" || userRole === "Employee") {
     if (client) filter.client = client;
     if (consultant) filter.consultant = consultant;
   }
   ```

---

## 3. Phase 2: High-Priority Security (Week 2)

### Step 2.1: Add Reset Password Validation (P1)

**Problem:** `PUT /auth/reset-password/:token` has no validation on `req.body.password`.

**Files:**
- `backend/src/api/v1/routes/auth.routes.js`
- `backend/src/api/v1/validators/auth.validator.js`
- `backend/src/api/v1/controllers/auth.controller.js`

**Actions:**

1. Create `resetPasswordSchema`:
   ```javascript
   const resetPasswordSchema = Joi.object({
     password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
       .messages({ "string.pattern.base": "Password must contain uppercase, lowercase, and number" }),
   });
   ```
2. Add `validate(resetPasswordSchema)` to reset-password route.
3. Use `req.body.password` only after validation.

---

### Step 2.2: Fix User Enumeration in Forgot Password (P1)

**Problem:** `forgotPassword` returns "There is no user with that email" (404), revealing whether an email exists.

**Files:**
- `backend/src/api/v1/controllers/auth.controller.js`

**Actions:**

1. Always return the same success message whether or not the email exists:
   ```javascript
   // Always return 200 with generic message
   return sendSuccess(res, "If an account exists with that email, you will receive a reset link.");
   ```
2. Only send the reset email if the user exists; do not change the HTTP response.

---

### Step 2.3: Sanitize Duplicate Key Error Response (P1)

**Problem:** On MongoDB duplicate key (11000), the API returns the conflicting value (e.g. email), aiding enumeration.

**Files:**
- `backend/src/middlewares/error.middleware.js`

**Actions:**

1. In production, return a generic message:
   ```javascript
   if (err.code === 11000) {
     const field = Object.keys(err.keyValue)[0];
     const message = process.env.NODE_ENV === "production"
       ? "A record with this value already exists"
       : `${field} '${err.keyValue[field]}' already exists`;
     return sendError(res, message, null, httpStatus.CONFLICT);
   }
   ```

---

### Step 2.4: Exclude Password from Consultant Create Response (P1)

**Problem:** `consultant.toObject()` after create may include hashed password.

**Files:**
- `backend/src/api/v1/controllers/consultant.controller.js`

**Actions:**

1. Delete password before returning:
   ```javascript
   const consultantResponse = consultant.toObject();
   delete consultantResponse.password;
   return sendSuccess(res, "Consultant created", consultantResponse, httpStatus.CREATED);
   ```

---

### Step 2.5: Sanitize Client Update (P1)

**Problem:** `updateClient` uses `$set: updateData` with raw `req.body`; no allowlist of fields.

**Files:**
- `backend/src/api/v1/controllers/client.controller.js`
- `backend/src/api/v1/validators/client.validator.js` (create if missing)

**Actions:**

1. Define an allowlist: `fullName`, `email`, `mobile`, `dob`, `address`, `city`, `state`, `country`, `pincode`, `emergencyContact`, `status`.
2. Filter: `const updateData = pick(req.body, allowlist);`
3. Add Joi validation for each field.

---

### Step 2.6: Escape Regex in Search Queries (ReDoS) (P1)

**Problem:** `$regex: search` and `new RegExp(q, "i")` with user input can cause ReDoS.

**Files:**
- `backend/src/api/v1/controllers/appointment.controller.js` (line ~711)
- `backend/src/api/v1/controllers/client.controller.js` (lines ~192–194)
- `backend/src/api/v1/controllers/consultant.controller.js` (line ~16)
- `backend/src/api/v1/controllers/location.controller.js` (lines ~43, ~65)

**Actions:**

1. Add helper:
   ```javascript
   function escapeRegex(str) {
     return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   ```
2. Use: `{ $regex: escapeRegex(search), $options: "i" }` instead of raw `search`.
3. Optionally limit `search`/`q` length (e.g. 100 chars).

---

### Step 2.7: Sanitize HTML for XSS (Privacy/Terms) (P1)

**Problem:** `dangerouslySetInnerHTML` with admin-provided content enables XSS if admin is compromised.

**Files:**
- `Consultant/src/pages/PrivacyPolicy.tsx`
- `Consultant/src/pages/TermsOfService.tsx`

**Actions:**

1. Install DOMPurify: `npm install dompurify && npm install -D @types/dompurify`
2. Sanitize before render:
   ```tsx
   import DOMPurify from 'dompurify';
   // ...
   dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, { ALLOWED_TAGS: ['p','b','i','u','a','ul','ol','li','h1','h2','h3','br'] }) }}
   ```

---

### Step 2.8: Clean Up Debug Artifacts (P1)

**Files:**
- `backend/.gitignore`
- Remove or ignore debug files

**Actions:**

1. Add to `.gitignore`:
   ```
   debug_*.js
   *_dump.json
   *_log.txt
   *.txt
   !README*.txt
   ```
2. Remove `users_dump.json` and similar from repo if committed.
3. Remove or relocate `debug_*.js` scripts outside the main codebase.

---

## 4. Phase 3: Medium-Priority Security (Week 2–3)

### Step 3.1: CORS Configuration

- Move hardcoded origins to `process.env.CORS_ORIGINS` (comma-separated).
- Remove development IPs from production config.
- Restrict `/public` static route to same-origin or specific origins instead of `*` if it serves user content.

### Step 3.2: 401 Interceptor – Clear Session on Expiry

- In `Consultant/src/api/axiosInstance.ts` and `Consultation_Admin`: uncomment `localStorage.clear()` and redirect on 401, or implement refresh token flow.

### Step 3.3: Update .env.example

- Add placeholders: `JWT_SECRET=`, `RAZORPAY_KEY_ID=`, `RAZORPAY_KEY_SECRET=`, `MONGO_URI=`, `CORS_ORIGINS=`.
- Remove any real-looking values (e.g. `EMAIL_PASS`).

---

## 5. Phase 4: GDPR Compliance (Weeks 3–4)

### Step 4.1: Right to Access (Art. 15) – Data Export (Art. 15)

**New endpoint:** `GET /api/v1/users/me/export` (or `/clients/profile/export` for Client)

**Actions:**

1. Create `exports.exportMyData` in `user.controller.js` or `client.controller.js`.
2. Collect: profile, appointments (metadata), documents (metadata), transactions (metadata).
3. Return JSON (or ZIP with JSON + files).
4. Restrict to authenticated user only.

---

### Step 4.2: Right to Erasure – Self-Service Account Deletion (Art. 17)

**New endpoint:** `DELETE /api/v1/users/me` or `DELETE /api/v1/clients/profile`

**Actions:**

1. Require password or re-auth (e.g. OTP) before deletion.
2. Cascade delete: Client/Consultant profile, appointments, documents (S3), transactions, notifications.
3. Anonymize or delete related records (e.g. appointment snapshots).
4. Return confirmation; do not allow recovery.

---

### Step 4.3: Consent Management

**Actions:**

1. Add `consent` fields to User/Client/Consultant:
   - `termsAcceptedAt`, `privacyAcceptedAt`, `marketingConsent`, `dataProcessingConsent`.
2. On signup, record timestamps when user accepts Terms and Privacy.
3. Add `PATCH /users/me/consent` to update marketing/data-processing consent.
4. Document consent in Privacy Policy.

---

### Step 4.4: Data Retention Policy

**Actions:**

1. Define retention: e.g. OTP 5 min, logs 90 days, inactive accounts 2 years.
2. Add scheduled job to delete expired OTPs (already have TTL index).
3. Add job to anonymize/delete inactive users after retention period.
4. Document in Privacy Policy.

---

### Step 4.5: Breach Notification Process

**Actions:**

1. Document process: detect → assess → notify DPA within 72h if risk to rights.
2. Add template for user notification.
3. Assign owner (DPO or equivalent).

---

## 6. Phase 5: HIPAA Readiness (Weeks 5–6)

### Step 5.1: Audit Logging for PHI Access

**Actions:**

1. Create `AuditLog` model: `userId`, `action`, `resource`, `resourceId`, `timestamp`, `ip`, `userAgent`.
2. Log: document view/download, appointment view, client/consultant profile view.
3. Store logs in separate collection or external service.
4. Retain per HIPAA (6 years).

---

### Step 5.2: Encryption Verification

**Actions:**

1. Confirm MongoDB encryption at rest (Atlas or self-managed).
2. Confirm S3 server-side encryption (SSE-S3 or SSE-KMS).
3. Enforce HTTPS (TLS 1.2+) for all traffic.
4. Document in security policy.

---

### Step 5.3: Business Associate Agreements (BAAs)

**Actions:**

1. Identify vendors handling PHI: MongoDB, AWS S3, Razorpay (if applicable), Agora (if recordings contain PHI), email provider.
2. Sign BAAs with each.
3. Maintain BAA register.

---

### Step 5.4: Access Controls & Session Timeout

**Actions:**

1. Review RBAC; ensure minimum necessary access.
2. Add idle session timeout (e.g. 15 min) or shorter JWT expiry for sensitive roles.
3. Implement optional MFA for Admin/Consultant.

---

## 7. Phase 6: Operational & Process (Ongoing)

### Step 6.1: Environment & Secrets

- Move CORS origins to env: `CORS_ORIGINS`.
- Ensure `.env.example` has placeholders only (no real credentials).
- Add `JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `MONGO_URI` to `.env.example`.

### Step 6.2: Logging

- Replace `console.log` with structured logger.
- Redact PII/PHI from logs.
- Use log levels (debug in dev, info in prod).

### Step 6.3: Token Storage (Future)

- Consider httpOnly cookies for JWT to reduce XSS impact.
- Requires frontend and backend changes.

### Step 6.4: Security Headers

- Verify Helmet config (CSP, HSTS, etc.).
- Add `X-Content-Type-Options`, `X-Frame-Options` if not set.

---

## 8. Appendix: File Reference

| Area | Files |
|------|-------|
| Auth | `backend/src/api/v1/controllers/auth.controller.js`, `auth.routes.js`, `auth.validator.js` |
| Documents | `backend/src/api/v1/controllers/document.controller.js`, `document.routes.js` |
| Storage | `backend/src/api/v1/controllers/storage.controller.js`, `storage.routes.js` |
| Clients | `backend/src/api/v1/controllers/client.controller.js` |
| Error handling | `backend/src/middlewares/error.middleware.js` |
| App config | `backend/src/app.js` |
| Frontend XSS | `Consultant/src/pages/PrivacyPolicy.tsx`, `TermsOfService.tsx` |

---

## Checklist Summary

- [ ] 1.1 OTP – remove from response and logs
- [ ] 1.2 Rate limiting enabled
- [ ] 1.3 Storage proxy – add auth and ownership check
- [ ] 1.4 Document IDOR – restrict client/consultant filters
- [ ] 2.1 Reset password validation
- [ ] 2.2 Forgot password – generic response
- [ ] 2.3 Duplicate key – sanitize in prod
- [ ] 2.4 Consultant create – exclude password
- [ ] 2.5 Client update – allowlist
- [ ] 2.6 Regex escape for search
- [ ] 2.7 DOMPurify for Privacy/Terms
- [ ] 2.8 Debug artifacts cleaned
- [ ] 4.1 Data export endpoint
- [ ] 4.2 Self-service deletion
- [ ] 4.3 Consent fields
- [ ] 4.4 Retention policy
- [ ] 5.1 Audit logging
- [ ] 5.2 Encryption verification
- [ ] 5.3 BAAs
