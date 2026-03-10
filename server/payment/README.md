# Arabic Bank Payment Module (TypeScript)

Production-ready payment flow for Arabic Bank Payment Gateway.

## Build

From `server/`:

```bash
npm run build:payment
```

Then start the server as usual. The module is mounted at `/api/payment` (same as existing routes).

## Endpoints

- **POST /api/payment/create-session**  
  Creates a payment session.  
  Body: `orderId`, `amount`, `currency` (optional), `customerName`, `customerEmail`.  
  Returns: `redirectUrl` or `paymentToken`, `orderId`.

- **POST /api/payment/webhook**  
  Bank callback. Requires header `x-arabic-bank-signature` (HMAC-SHA256 of raw body).  
  Updates order `payment_status` to `paid` or `failed`; idempotent (only updates if status was `pending`).

## Environment

| Variable                            | Description                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| ARABIC_BANK_API_URL                 | Gateway base URL (e.g. `https://api.arabicbank.example/v1`) |
| ARABIC_BANK_MERCHANT_ID             | Merchant ID                                                 |
| ARABIC_BANK_SECRET_KEY              | Secret for webhook signature verification                   |
| SUPABASE_URL / SUPABASE_SERVICE_KEY | Used to read/update orders                                  |
| ORDERS_TABLE                        | Optional; default `orders`                                  |

## Order table

Ensure the orders table has at least:

- `id` (uuid/text)
- `amount` (numeric)
- `currency` (text, optional)
- `payment_status` or `paymentStatus` ('pending' | 'paid' | 'failed')
- `status` (optional; updated to paid/failed with payment_status)
- `created_at`, `updated_at` (timestamptz)

Example (Supabase):

```sql
-- Add columns if missing
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'JOD',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Optional: ensure status exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
```

## Security

- Input validation on create-session (amount > 0, valid email, required fields).
- Webhook signature verified with HMAC-SHA256 (no processing without valid signature).
- No card data stored; use HTTPS in production.
- Duplicate webhook processing avoided by updating only when `payment_status = 'pending'`.
