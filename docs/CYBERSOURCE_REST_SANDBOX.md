# Cybersource REST API (Simple Order) – Sandbox Checkout

Checkout uses **only** the Cybersource REST API (Simple Order) with HTTP Signature. No Secure Acceptance Hosted Checkout. No `outlet_id` or `terminal_id` (the bank does not provide these for testing).

## Requirements

- **Sandbox endpoint:** `https://apitest.cybersource.com`
- **Authentication:** HTTP Signature (HMAC-SHA256)
- **Flow:** Authorization → Capture (server-side)
- **Test card:** Official sandbox card only (e.g. Visa `4111111111111111` – see [Testing Guide](https://developer.cybersource.com/hello-world/testing-guide.html))

## Environment variables (server)

Set in `server/.env`. The code reads exactly these (with optional fallback):

| Variable | Required | Description |
|----------|----------|-------------|
| `CYBS_REST_HOST` | No (default: `https://apitest.cybersource.com`) | Sandbox or production API host |
| `CYBS_REST_MERCHANT_ID` | Yes* | Merchant ID from Business Center (*or `CYBERSOURCE_MERCHANT_ID`) |
| `CYBS_REST_KEY_ID` | Yes | REST API Key ID |
| `CYBS_REST_SECRET_KEY` | Yes | REST API Shared Secret |

```env
CYBS_REST_HOST=https://apitest.cybersource.com
CYBS_REST_MERCHANT_ID=your_merchant_id
CYBS_REST_KEY_ID=your_key_id
CYBS_REST_SECRET_KEY=your_shared_secret
```

Obtain Key ID and Shared Secret from Cybersource Business Center (Test) → API Key Management (REST API keys, not Hosted Checkout keys).

## API (matches code)

- **Checkout payment:** `POST /api/payments/cybersource/rest/process`  
  - Body: `{ orderId: string, amount: number, currency?: string }` (currency default `USD`)  
  - Success (200): `{ success: true, orderId, paymentId, captureId }`  
  - Backend checks authorization decision is `AUTHORIZED` before capture and before calling `handlePaymentCallback`.
- **Test only (disabled in production):** `POST /api/payments/cybersource/rest/test`  
  - Body: `{ amount?, currency?, reference? }`  
  - Uses same test card; returns auth + capture payload.

## Flow

1. User fills checkout form and submits.
2. Frontend creates order via `POST /api/orders`, then calls `POST /api/payments/cybersource/rest/process` with `{ orderId, amount, currency }` (see `processCybersourceRestPayment` in `services/checkoutApi.ts`).
3. Backend runs authorize (POST `https://apitest.cybersource.com/pts/v2/payments`) then capture (POST `.../pts/v2/payments/{id}/captures`) using the official test card (Visa `4111111111111111`).
4. On success (decision `AUTHORIZED`), backend calls `handlePaymentCallback(orderId, 'success')` and returns `{ success: true, orderId, paymentId, captureId }`.
5. Frontend calls `onPaymentSuccess(orderId)` and shows success/return page.

Transactions appear as **REST API** in Cybersource Transaction Management. Reason Code 150 (outlet/terminal) does not apply to this integration.

## What is not used

- Secure Acceptance Hosted Checkout (no redirect to Cybersource hosted form).
- `outlet_id` / `terminal_id` (never sent).
- Processor-specific configuration (e.g. fdiglobal).

## Code reference (matches this doc)

| Item | Location |
|------|----------|
| Route mount | `server/server.js`: `app.use('/api/payments', ...)` → `cybersource.routes.js` |
| REST process handler | `server/modules/payments/cybersource/cybersource.rest.controller.js`: `processRestPaymentHandler` |
| REST service (auth/capture) | `server/modules/payments/cybersource/cybersource.rest.service.js`: `authorizePayment`, `capturePayment` |
| Env config | Same service: `getRestConfig()` reads `CYBS_REST_*` (and `CYBERSOURCE_MERCHANT_ID` fallback) |
| Frontend API | `services/checkoutApi.ts`: `processCybersourceRestPayment(orderId, amount, currency)` |
| Checkout usage | `views/CheckoutPage.tsx`: after `createOrder`, calls `processCybersourceRestPayment(orderId, totalAmount, 'USD')` then `onPaymentSuccess(orderId)` |

## References

- [Testing Guide](https://developer.cybersource.com/hello-world/testing-guide.html) – test card numbers
- [HTTP Signature](https://developer.cybersource.com/library/documentation/dev_guides/REST_API/Getting_Started/html/REST_GS/ch_authentication.5.3.htm) – authentication
- [Basic Authorization (REST)](https://developer.cybersource.com/docs/cybs/en-us/payments/developer/citimb/so/payments/payments-processing-basic-intro/payments-processing-basic-auth-intro/payments-processing-basic-auth-ex-so.html) – request structure
