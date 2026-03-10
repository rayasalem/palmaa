# LogesTechs Shipment API – Testing & Verification Guide

## Overview

The project integrates with **LogesTechs** (real logistics company), not mock data. All shipment endpoints call the live LogesTechs API at `https://apisv2.logestechs.com/api`.

**There is no mock mode.** If credentials are missing, the API returns an error; it does not fall back to fake responses.

---

## Configuration (Environment Variables)

| Variable                | Required                | Default                             | Description                                              |
| ----------------------- | ----------------------- | ----------------------------------- | -------------------------------------------------------- |
| `SHIPMENT_API_BASE`     | No                      | `https://apisv2.logestechs.com/api` | LogesTechs API base URL                                  |
| `LOGESTECHS_COMPANY_ID` | No                      | `634`                               | Company ID header                                        |
| `LOGESTECHS_EMAIL`      | **Yes** (create/cancel) | —                                   | Your LogesTechs account email                            |
| `LOGESTECHS_PASSWORD`   | **Yes** (create/cancel) | —                                   | Your LogesTechs account password                         |
| `LOG_SHIPMENT_REQUESTS` | No                      | `false`                             | Set to `true` to log full request/response for debugging |

**Sender defaults (optional):** `SENDER_NAME`, `SENDER_PHONE`, `SENDER_ADDRESS_LINE1`, `SENDER_CITY_ID`, `SENDER_VILLAGE_ID`, `SENDER_REGION_ID`, `SENDER_BUSINESS_NAME`

---

## Enable Request/Response Logging

Add to your `.env`:

```
LOG_SHIPMENT_REQUESTS=true
```

Restart the server. You will see full request and response bodies in the console (passwords are redacted).

---

## API Endpoints (Backend)

| Method | Path                                      | Purpose                                   |
| ------ | ----------------------------------------- | ----------------------------------------- |
| POST   | `/api/shipment/create`                    | Create shipment for an order              |
| GET    | `/api/shipment/status?id=` or `?barcode=` | Get package status                        |
| POST   | `/api/shipment/print-pdf`                 | Print AWB labels (body: `{ ids: [...] }`) |
| PUT    | `/api/shipment/:shipmentId/cancel`        | Cancel shipment                           |

**Note:** There is no “calculate shipping cost” endpoint in the current implementation. LogesTechs may expose one; refer to their [Postman collection](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis) for available operations.

---

## Step-by-Step Manual Testing

### Prerequisites

1. Valid LogesTechs account credentials (`LOGESTECHS_EMAIL`, `LOGESTECHS_PASSWORD`)
2. At least one order in the database
3. Valid `cityId`, `villageId`, `regionId` from LogesTechs address system

---

### 1. Test Create Shipment (Postman / curl)

**Postman**

- Method: `POST`
- URL: `http://localhost:5000/api/shipment/create`
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "orderId": "YOUR_ORDER_ID",
  "recipient_name": "John Doe",
  "phone": "0599123456",
  "addressLine1": "123 Main St",
  "cityId": 1,
  "villageId": 1,
  "regionId": 1,
  "weight": 2.5,
  "cod": 50,
  "quantity": 1
}
```

**curl**

```bash
curl -X POST http://localhost:5000/api/shipment/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-xxxxxxxx",
    "recipient_name": "John Doe",
    "phone": "0599123456",
    "addressLine1": "123 Main St",
    "cityId": 1,
    "villageId": 1,
    "regionId": 1,
    "weight": 2.5,
    "cod": 50,
    "quantity": 1
  }'
```

**Expected responses**

- Success (200): `{ "success": true, "order": {...}, "shipment": {...} }`
- Credentials missing (500): `{ "success": false, "error": "LogesTechs credentials not configured (LOGESTECHS_EMAIL, LOGESTECHS_PASSWORD)" }`
- LogesTechs error (500): `{ "success": false, "error": "..." }`

---

### 2. Test Get Shipment Status

**Postman**

- Method: `GET`
- URL: `http://localhost:5000/api/shipment/status?id=SHIPMENT_ID`  
  or: `http://localhost:5000/api/shipment/status?barcode=BARCODE`

**curl**

```bash
curl "http://localhost:5000/api/shipment/status?id=12345"
# or
curl "http://localhost:5000/api/shipment/status?barcode=LT123456"
```

---

### 3. Test Print AWB PDF

**Postman**

- Method: `POST`
- URL: `http://localhost:5000/api/shipment/print-pdf`
- Body: `{ "ids": [123, 456] }`

**curl**

```bash
curl -X POST http://localhost:5000/api/shipment/print-pdf \
  -H "Content-Type: application/json" \
  -d '{"ids":[12345]}'
```

---

### 4. Test Cancel Shipment

**Postman**

- Method: `PUT`
- URL: `http://localhost:5000/api/shipment/12345/cancel`

**curl**

```bash
curl -X PUT http://localhost:5000/api/shipment/12345/cancel
```

---

## Verifying Real LogesTechs Connection

1. **Check env vars**

   Ensure `LOGESTECHS_EMAIL` and `LOGESTECHS_PASSWORD` are set and not placeholders.

2. **Enable logging**

   Set `LOG_SHIPMENT_REQUESTS=true` and restart. Inspect logs to confirm:
   - Requests go to `https://apisv2.logestechs.com/api/...`
   - Responses come from LogesTechs (status, message, shipment IDs).

3. **Call LogesTechs directly**

   Using Postman or curl, call the LogesTechs API with your credentials:
   - Endpoint: `POST https://apisv2.logestechs.com/api/ship/request/by-email`
   - Header: `company-id: 634`
   - Body: `{ "email": "...", "password": "...", ... }`  
     See their [Postman collection](https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis) for the full schema.

4. **Create a shipment via backend**

   Create an order, then call `POST /api/shipment/create`. If LogesTechs accepts it, you receive a real `shipment_id` and barcode. Use `GET /api/shipment/status` to confirm it appears in their system.

---

## Production vs Development

- **Same API base URL** for both: `https://apisv2.logestechs.com/api`
- **Production vs development is determined by:**
  - Different `LOGESTECHS_COMPANY_ID` (if LogesTechs assigns separate IDs for sandbox vs production)
  - Different credentials (test vs live accounts)

Ask LogesTechs for:

- Sandbox/test credentials for development
- Production credentials for live use

There is no `SHIPMENT_MOCK` or `USE_MOCK_SHIPMENT` flag in this codebase; it always uses the real API.
