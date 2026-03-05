# Cybersource Secure Acceptance Hosted Checkout – Sandbox Only

Integration follows **only** official Cybersource documentation. No `outlet_id`, `terminal_id`, or processor configuration (e.g. fdiglobal). Test account from [developer.cybersource.com](https://developer.cybersource.com); test cards from [Testing Guide](https://developer.cybersource.com/hello-world/testing-guide-v1.html).

---

## Flow (Redirection)

1. Merchant server creates order and builds signed payload with **required signed fields** only.
2. Frontend POSTs the signed payload to **Secure Acceptance** endpoint:  
   `https://testsecureacceptance.cybersource.com/pay`
3. Customer enters card on Cybersource hosted page; Cybersource processes the transaction.
4. Cybersource redirects customer to **Customer Response URL** (set in profile) and/or sends **Merchant Notification** (server-to-server) to **Merchant POST URL**.

---

## Required Signed Fields (Official)

Per [Required Signed Fields](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns/sa-required-signed-fields.html):

- `access_key`
- `amount`
- `currency`
- `locale`
- `profile_id`
- `reference_number`
- `signed_date_time`
- `signed_field_names`
- `transaction_type`
- `transaction_uuid`

**Excluded from signing:** `card_number`, `card_cvn`, `signature`.

**HMAC SHA256:** String-to-sign = comma-separated `name=value` for each field in `signed_field_names` (in order). Signature = Base64(HMAC-SHA256(secret_key, string_to_sign)). Ref: [Scripting Language Samples](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-samples-scripting-languages.html).

---

## Environment (Sandbox)

In `server/.env`:

| Variable | Description |
|----------|-------------|
| `CYBS_PROFILE_ID` | From Business Center → Secure Acceptance Settings → Profile |
| `CYBS_ACCESS_KEY` | From Security Keys (Create Key) |
| `CYBS_SECRET_KEY` | From Security Keys (same key) |
| `CYBS_HOSTED_PAY_URL` | `https://testsecureacceptance.cybersource.com/pay` (test) |
| `CYBS_LOCALE` | e.g. `ar-xn` |
| `CYBS_CURRENCY` | e.g. `USD` |

**Do not set:** `outlet_id`, `terminal_id`, or any processor-specific vars. Not required by official Hosted Checkout spec; sending them can trigger Reason Code 150 on some processors.

---

## Avoiding Reason Code 150

- **150** can mean processor configuration issue, service fee not configured, or invalid/missing processor-specific fields (e.g. `usd_outlet_id`, `usd_terminal_id`).
- This integration **does not send** `outlet_id`, `terminal_id`, or any processor config. The request contains **only** the 10 required signed fields + `signature`.
- If you still see **"Reason Code 150: usd_outlet_id, usd_terminal_id invalid or missing"**, the cause is **not** the application code. The **processor or profile** attached to your Secure Acceptance profile in Business Center is configured to **require** these fields. The code intentionally does not send them (per “no bank-provided values”).
- **What you can do:**
  1. In **Business Center (Test)** → **Payment Configuration** → **Secure Acceptance** → your profile: check if the assigned processor or “Payment processor” has an option to **not require** outlet/terminal for test, or switch to a test processor that doesn’t require them.
  2. **Contact Cybersource (or your implementation contact)** and request a **Sandbox test profile** that works with **only** the standard Secure Acceptance required fields (no outlet_id/terminal_id). Some test setups use a generic Cybersource test processor that does not require these.
  3. Do **not** add outlet/terminal to the code unless the bank/Cybersource explicitly provides test values and you decide to support them.

---

## Failure Scenarios and Handling

| Scenario | Cause | Handling |
|----------|--------|----------|
| **400 Bad Request** | Invalid/missing required field, wrong signature, or profile mismatch | Check request has all required fields; verify `signed_field_names` order matches string-to-sign; confirm Profile ID, Access Key, Secret Key and that profile is activated. |
| **101** | Missing required data (e.g. `bill_to_address_country`) | If profile requires billing country, add it to the payload or enable/configure in profile so Hosted form collects it. |
| **150** | Processor/config or service fee / outlet–terminal expectation | Do not send outlet/terminal; use Sandbox profile without processor-specific requirements; disable service fee for the profile if applicable. |
| **Invalid signature** | Secret key mismatch or wrong field order | Ensure Secret Key matches Business Center; use exact `signed_field_names` order when building string-to-sign; HMAC-SHA256 with UTF-8. |
| **Redirect / notification not received** | Customer Response URL or Merchant POST URL wrong | Set in profile: Customer Response URL (redirect after payment); Merchant POST URL = `https://<your-backend>/api/payments/cybersource/notify`. |
| **Profile not active** | Profile not promoted/activated | In Business Center, activate the profile (e.g. “Promote Profile” / Activate). |

---

## Test Cards

Use only official test card numbers from:

- [Testing Guide (v1)](https://developer.cybersource.com/hello-world/testing-guide-v1.html)  
- [Testing Guide](https://developer.cybersource.com/hello-world/testing-guide.html)

Example (Sandbox): Visa `4111111111111111`, expiry any future date, CVV any 3 digits.

---

## Code References

- Signed fields and HMAC: `server/modules/payments/cybersource/cybersource.service.js` (REQUIRED_SIGNED_FIELDS), `cybersource.signature.js`
- Session endpoint: `POST /api/payments/cybersource/hosted-session`
- Notification handler: `POST /api/payments/cybersource/notify` (verify signature, then update order via paymentService)

---

## Official Links

- [Secure Acceptance Hosted Checkout](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance.html)
- [Required Signed Fields](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns/sa-required-signed-fields.html)
- [Scripting Language Samples](https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-samples-scripting-languages.html)
- [Test Cards](https://developer.cybersource.com/hello-world/testing-guide-v1.html)
- [GitHub – CyberSource](https://github.com/CyberSource)
- [Developer API Reference](https://developer.cybersource.com/api-reference-assets/index.html)
