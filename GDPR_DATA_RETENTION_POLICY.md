# GDPR Data Retention Policy

**Effective:** As of implementation  
**Owner:** Data Protection Officer / Platform Admin

---

## 1. Retention Periods

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| OTP records | 5 minutes | MongoDB TTL index (automatic) |
| Session/Token | 24 hours (JWT expiry) | Client-side + token expiry |
| Application logs | 90 days | Scheduled job / log rotation |
| User/Client/Consultant profiles | Until account deletion | User-initiated or retention job |
| Appointments | 2 years after completion | Retention job (anonymize or delete) |
| Documents (PHI) | Per legal requirement | Manual review; min 6 years if healthcare |
| Transactions | 7 years (tax/legal) | Retention job after period |
| Audit logs (if implemented) | 6 years | Retained per HIPAA if applicable |

---

## 2. Inactive Account Policy

- **Definition:** Account with no login for 2 years.
- **Action:** Email notification 30 days before anonymization; then anonymize or delete.
- **Implementation:** Run `node backend/scripts/retention-inactive-users.js` (monthly via cron).

---

## 3. User Rights

- **Right to Access (Art. 15):** `GET /api/v1/clients/profile/export` or `GET /api/v1/consultants/me/export`
- **Right to Erasure (Art. 17):** `DELETE /api/v1/clients/profile` or `DELETE /api/v1/consultants/me`
- **Right to Rectification:** Update profile via PATCH endpoints.
- **Right to Restrict Processing:** Update consent via `PATCH /profile/consent` or `PATCH /me/consent`.

---

## 4. Document in Privacy Policy

Ensure your Privacy Policy includes:
- Retention periods for each data category.
- How users can request data export or deletion.
- Contact for data protection inquiries.
