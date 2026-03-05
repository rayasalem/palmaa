# Cybersource Secure Acceptance Hosted Checkout – Technical Validation Report

**Audit date:** Per implementation review  
**Scope:** Hosted Checkout (Redirection) integration, Sandbox only  
**References:** [Required Signed Fields](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns/sa-required-signed-fields.html), [Request Fields](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-wm-api-fields/sa-request-fields.html), [Scripting Language Samples](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-samples-scripting-languages.html)

---

## 1. Required Signed Fields – Compliance

### 1.1 Official documentation

Per **Required Signed Fields**, these fields are required in all Secure Acceptance requests and must appear in `signed_field_names`:

| # | Field name (doc) | In code | In signed_field_names | Value source |
|---|------------------|---------|------------------------|--------------|
| 1 | access_key | ✅ | ✅ | CYBS_ACCESS_KEY |
| 2 | amount | ✅ | ✅ | order amount, 2 decimals |
| 3 | currency | ✅ | ✅ | CYBS_CURRENCY |
| 4 | locale | ✅ | ✅ | CYBS_LOCALE |
| 5 | profile_id | ✅ | ✅ | CYBS_PROFILE_ID |
| 6 | reference_number | ✅ | ✅ | orderId |
| 7 | signed_date_time | ✅ | ✅ | ISO 8601 UTC |
| 8 | signed_field_names | ✅ | ✅ | comma-separated list |
| 9 | transaction_type | ✅ | ✅ | `sale` |
| 10 | transaction_uuid | ✅ | ✅ | crypto.randomUUID() |

**Excluded from signing (per doc):** `card_number`, `card_cvn`, `signature`.  
- **Implementation:** `signature` is not in `signed_field_names`; it is computed after building the list and sent as a separate POST field. ✅  
- **unsigned_field_names:** Not listed in Required Signed Fields or Request Fields as required for minimal Hosted Checkout. Not sent; no deviation. ✅  

**Verdict:** All required signed fields are present and only those. No extra processor fields (no outlet_id, terminal_id). **Compliant.**

---

## 2. Field ordering in signed_field_names

**Documentation:** “The sequence of the fields in the string is critical to the signature generation process.” (Request Fields)

**Implementation:**  
- `REQUIRED_SIGNED_FIELDS` in `cybersource.service.js` uses the **exact order** from the Required Signed Fields doc:  
  `access_key`, `amount`, `currency`, `locale`, `profile_id`, `reference_number`, `signed_date_time`, `signed_field_names`, `transaction_type`, `transaction_uuid`.  
- The same array is used to build (1) the `signed_field_names` value and (2) the string-to-sign in `buildStringToSign()`, so order is consistent.

**Verdict:** Order matches documentation and is consistent. **Compliant.**

---

## 3. HMAC SHA256 signature generation

**Documentation:**  
- “Keyed-HMAC signing the request parameters using the shared secret key.” (Scripting Language Samples)  
- “Create a comma-separated name=value string of the POST fields included in signed_field_names.” (Request Fields)  
- Example format: `bill_to_forename=john,bill_to_surname=doe,...`

**Implementation (`cybersource.signature.js`):**

1. **String to sign:**  
   `buildStringToSign(fields, signedFieldNames)` builds `name=value` for each name in `signedFieldNames` (in order), joined by commas. ✅  

2. **Algorithm:**  
   `crypto.createHmac('sha256', secretKey).update(toSign, 'utf8').digest('base64')` – HMAC-SHA256 with shared secret, Base64 output. ✅  

3. **Secret key:**  
   Used as provided (UTF-8). Doc does not require Base64 decoding for Secure Acceptance Hosted Checkout secret. ✅  

**Verdict:** HMAC SHA256 and string-to-sign match the documented method. **Compliant.**

---

## 4. Processor-specific configuration

**Rules:** No outlet_id, terminal_id, or processor-specific configuration.

**Implementation:**  
- No reads of `CYBS_*_OUTLET_ID` or `CYBS_*_TERMINAL_ID`.  
- No `outlet_id`, `terminal_id`, `fdiglobal`, or other processor fields in request or in `signed_field_names`.

**Verdict:** No processor-specific configuration. **Compliant.**

---

## 5. Sandbox mode and credentials

- **Endpoint:** `CYBS_HOSTED_PAY_URL` defaults to `https://testsecureacceptance.cybersource.com/pay`. ✅  
- **Credentials:** Profile ID, Access Key, Secret Key from env (Business Center test profile). No hardcoded credentials. ✅  
- **Test account:** Intended for Sandbox/test account from developer.cybersource.com; no dependency on bank-provided outlet/terminal. ✅  

**Verdict:** Sandbox-only usage with configurable test credentials. **Compliant.**

---

## 6. Flow vs documentation

| Step | Doc (Hosted Checkout Redirection) | Implementation |
|------|-----------------------------------|----------------|
| 1 | Merchant builds signed request with required fields | `createHostedSession()` builds fields, `signFields()` signs ✅ |
| 2 | POST to Secure Acceptance endpoint | Frontend POSTs to `session.actionUrl` (testsecureacceptance.cybersource.com/pay) ✅ |
| 3 | Customer enters card on hosted page | Handled by Cybersource ✅ |
| 4 | Cybersource redirects / notifies merchant | Customer Response URL (profile); Merchant POST to `/api/payments/cybersource/notify` ✅ |
| 5 | Merchant verifies signature on notification | `verifySignature(payload, secretKey)` with same HMAC logic ✅ |

**Verdict:** Flow matches Secure Acceptance Hosted Checkout (redirection). **Compliant.**

---

## 7. Failure cases and reason codes (expected behaviour)

| Scenario | Expected / typical reason code | Implementation handling |
|----------|--------------------------------|---------------------------|
| Invalid or missing required field | 400 / 101 | Backend validates orderId, amount; Cybersource validates request. No undocumented assumptions. |
| Invalid signature | Rejected by Cybersource | String-to-sign and HMAC match doc; notification handler uses same logic and constant-time compare. |
| Declined card | 2xx (e.g. 200 with decision REJECT) | Notification handler treats non-ACCEPT as failure and calls `handlePaymentCallback(orderId, 'failed')`. |
| Duplicate / replay | Rejected or duplicate detection | `signed_date_time` + `transaction_uuid` support uniqueness; idempotency by transaction_id in callback. |
| Profile not active / wrong credentials | 400 / 403 / 4xx | No special-case handling; error returned to client. |
| **Reason Code 150** (processor/config, service fee, or invalid processor fields) | **Avoided** | No outlet_id, terminal_id, or processor fields sent; no service fee or processor-specific config in code. |

**Verdict:** Failure handling is consistent with documented behaviour; Reason Code 150 is not introduced by this implementation. **Compliant.**

---

## 8. Notification handler

- **Signature verification:** Uses same `signFields()` / `verifySignature()` and secret key. ✅  
- **Constant-time comparison:** `crypto.timingSafeEqual()` for signature. ✅  
- **Decision:** Uses `decision` (ACCEPT vs other); updates order via `handlePaymentCallback(orderId, 'success' | 'failed')`. ✅  
- **Idempotency:** Uses `transaction_id` when present for callback. ✅  

**Verdict:** Notification handling matches documented authentication and behaviour. **Compliant.**

---

## 9. Deviations and corrections

| Item | Status |
|------|--------|
| unsigned_field_names | Not in Required Signed Fields; not sent. No change. ✅ |
| signature in signed_field_names | Doc excludes it; code does not include it. ✅ |
| Field order | Aligned to doc order: access_key, amount, currency, locale, profile_id, reference_number, signed_date_time, signed_field_names, transaction_type, transaction_uuid. ✅ |
| outlet_id / terminal_id | Not used; no bank or processor values required. ✅ |

**No remaining deviations identified.**

---

## 10. Summary

| Criterion | Result |
|-----------|--------|
| Required signed fields (all 10, no more) | ✅ Compliant |
| Excluded fields (card_number, card_cvn, signature) | ✅ Compliant |
| signed_field_names ordering | ✅ Matches doc, consistent with string-to-sign |
| HMAC SHA256 + string-to-sign | ✅ Matches doc |
| No processor-specific config (no outlet/terminal) | ✅ Compliant |
| Sandbox-only, test credentials | ✅ Compliant |
| Redirection flow | ✅ Compliant |
| Notification verification and handling | ✅ Compliant |
| Reason Code 150 not caused by implementation | ✅ Compliant |

**Conclusion:** The Hosted Checkout integration is **compliant** with the official Cybersource Secure Acceptance Hosted Checkout documentation. No outlet_id, terminal_id, or bank-provided values are required; no undocumented assumptions identified; failure cases and Reason Code 150 are addressed as above.

---

## Code references

| Component | File |
|-----------|------|
| Signed fields + session creation | `server/modules/payments/cybersource/cybersource.service.js` |
| HMAC and verification | `server/modules/payments/cybersource/cybersource.signature.js` |
| Hosted session API | `server/modules/payments/cybersource/cybersource.controller.js` |
| Routes | `server/modules/payments/cybersource/cybersource.routes.js` |
| Frontend session + redirect | `views/CheckoutPage.tsx`, `services/checkoutApi.ts` |
