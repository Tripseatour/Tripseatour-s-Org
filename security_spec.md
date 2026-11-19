# Security Specification — Trip Sea Tour Firestore Rules

## 1. Data Invariants
1. **Default-Deny Baseline**: Every path not explicitly matched is denied (`allow read, write: if false`).
2. **Admin-Only PII & Financial Controls**: `bookings` (read/list/update/delete), `customers`, `suppliers`, `config/private`, and `metadata/deleted_ids` are accessible ONLY to verified Admin users (`isAdmin()` verifying `request.auth.token.email_verified == true`).
3. **Public Guest Booking Creation Integrity**: Unauthenticated guests creating a booking at `/bookings/{bookingId}` MUST provide all required fields, valid types/lengths, `orderStatus == 'pending'`, and `paymentStatus in ['pending', 'slip_uploaded']`. They CANNOT self-verify payments, inject shadow keys, or query/read other guests' bookings.
4. **Path ID Poisoning Guard**: Every single-document operation enforces `isValidId(docId)` (`<= 128` chars, `^[a-zA-Z0-9_-]+$`).
5. **Size & Quota Guard**: Every string field has strict `.size()` bounds; image/media payloads are capped under 900,000 bytes to stay safely within Firestore's 1 MiB document limit.
6. **Public Catalog & Reviews Isolation**: `/tours` lists only `isVisible == true` for public users; `/reviews` lists only `isApproved == true` for public users; `/public_media` allows exact-ID `get` only (no `list`) so uploaded slips cannot be scraped.
7. **Admin Role Privilege Escalation Prevention**: Only the bootstrapped superadmin (`asmr9941@gmail.com` with `email_verified == true`) can create/modify `/admins/{uid}` documents; non-admins cannot grant themselves admin access.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User signs in with `{ email: "asmr9941@gmail.com", email_verified: false }` trying to read `/customers/cust-1` or write `/tours/tour-1`.
2. **Self-Verified Booking Fraud**: Guest creates `/bookings/bk-hack` with `{ paymentStatus: "verified", orderStatus: "confirmed", ... }`.
3. **Shadow Field Injection on Booking**: Guest creates `/bookings/bk-shadow` with valid required fields plus `{ isAdmin: true }` or `{ refundApproved: true }`.
4. **Booking List Scraping (PII Leak)**: Unauthenticated or regular signed-in user executes `list` on `/bookings` or `/customers` or `/suppliers`.
5. **Private Config Secret Exfiltration**: Unauthenticated user tries to `get` `/config/private` containing `adminPin` and LINE channel access token.
6. **Self-Assigned Admin Escalation**: Regular user tries to `set` `/admins/{ownUid}` with `{ role: "superadmin" }`.
7. **Document ID Poisoning**: Attacker writes `/bookings/../../etc/passwd` or a 300-character invalid ID.
8. **1MB Payload Exhaustion / Value Poisoning**: Attacker creates `/reviews/rev-huge` with a 1,500,000-char `comment` or `rating: 999`.
9. **Hidden Tour Leak**: Unauthenticated user queries `/tours` without `where("isVisible", "==", true)`.
10. **Slip Scraping via List**: Unauthenticated user attempts `list` on `/public_media`.
11. **Booking Price Manipulation**: Guest creates `/bookings/bk-neg` with `totalAmount: -5000` or `adults: 0`.
12. **Immutable Field Tampering**: Signed-in non-admin tries to `update` `/bookings/bk-1` `createdAt` or `totalAmount` or `orderStatus`.
