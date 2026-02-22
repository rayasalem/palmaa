# Implementation Report: E-commerce Marketplace (Backend + Frontend)

## 1. Files and folders created

### Backend (`server/`)

| File / folder | Contents |
|---------------|----------|
| **server.js** | Express app: CORS, JSON, static `public/`, request logging. Mounts `/api/orders`, `/api/payment`, `/api/shipment`. Serves **GET /sandbox-pay** with `sandbox-pay.html`. Defines `/health`, 404 and global error handler. Port from env or 5000. |
| **.env.example** | Template: PORT, SANDBOX_PAYMENT_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, LOGESTECHS_COMPANY_ID, FRONTEND_URL. |
| **.gitignore** | Ignores `node_modules/` and `.env`. |
| **package.json** | express, axios, cors, dotenv, @supabase/supabase-js; nodemon (dev). Scripts: start, dev. |
| **config/supabaseClient.js** | Creates Supabase client from SUPABASE_URL and SUPABASE_SERVICE_KEY. |
| **routes/orderRoutes.js** | POST `/` → createOrder, GET `/:id` → getOrder. |
| **routes/paymentRoutes.js** | POST `/create` → createPayment, POST `/callback` → paymentCallback. |
| **routes/shipmentRoutes.js** | POST `/create` → createShipment. |
| **controllers/orderController.js** | Validates recipient_name, address, city, phone, amount, weight. try/catch. Calls orderService createOrder / getOrderById. |
| **controllers/paymentController.js** | createPayment: validates orderId, amount; accepts optional return_url; returns sandbox URL; comment “Replace with real bank credentials later.” paymentCallback: validates orderId, status; updates order paid/failed; supports simulation. |
| **controllers/shipmentController.js** | Validates orderId, recipient_name, address, city, phone, weight (weight > 0). try/catch. Calls shipmentService.createShipment. |
| **services/orderService.js** | createOrder (insert Supabase orders, status pending), getOrderById. |
| **services/paymentService.js** | updateOrderStatus, buildSandboxPaymentUrl(orderId, amount, returnUrl), createPayment (sets payment_processing, returns URL), handlePaymentCallback (paid/failed). |
| **services/shipmentService.js** | getOrderById, createLogesTechsShipment (POST to LogesTechs with company-id 634), updateOrderShipment (shipment_id, shipment_status), createShipment (fetch order → API → update order; reads shipment_id and shipment_status from response). |
| **public/sandbox-pay.html** | Sandbox payment UI: reads orderId, amount, return_url from query; “Pay (Success)” / “Cancel (Fail)” → POST /api/payment/callback → redirect to return_url?orderId=...&payment=success|failed. |
| **public/test-payment.html** | Test UI: input orderId, buttons to simulate success/failure via POST /api/payment/callback. |
| **README.md** | Setup, env vars, Supabase schema, full API list, sandbox and test instructions. |

### Frontend (project root)

| File / folder | Contents |
|---------------|----------|
| **services/checkoutApi.ts** | API client (base VITE_API_URL or http://localhost:5000): createOrder, getOrder, createPayment(orderId, amount, returnUrl), createShipment. |
| **views/CheckoutPage.tsx** | Form: recipient_name, address, city, phone, weight, amount (from cart). Validates all fields. Submit: createOrder → createPayment(return_url) → redirect to paymentUrl. Loading/error states, Back button. |
| **views/CheckoutReturnPage.tsx** | Reads return params ?orderId=...&payment=success|failed. If failed: show “Payment failed”. If success: poll GET /api/orders/:id until status=paid, then POST /api/shipment/create; show “Order confirmed” with orderId, payment status, shipment_id and shipment_status. |
| **App.tsx** (modified) | State: checkoutReturnOrderId, checkoutReturnPayment, showApiCheckout. Init: read orderId and payment from URL. Early render: CheckoutReturnPage when return params set; CheckoutPage when user and showApiCheckout. Passes onProceedToApiCheckout to CustomerView. |
| **views/CustomerView.tsx** (modified) | Optional prop onProceedToApiCheckout. Cart section: second button “Payment + Shipment (API)” that calls onProceedToApiCheckout. |
| **.env.example** (modified) | Added VITE_API_URL=http://localhost:5000. |

---

## 2. Endpoints added and purpose

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/orders | Create order (body: recipient_name, address, city, phone, amount, weight). Insert Supabase, status pending. |
| GET | /api/orders/:id | Get one order (polling and shipment creation). |
| POST | /api/payment/create | Body: orderId, amount, return_url (optional). Set order to payment_processing; return sandbox payment URL. |
| POST | /api/payment/callback | Body: orderId, status. Set order to paid or failed. Used by sandbox and test page. |
| POST | /api/shipment/create | Body: orderId, recipient_name, address, city, phone, weight. Fetch order, call LogesTechs API, save shipment_id and shipment_status, return order + shipment. |
| GET | /sandbox-pay | Serve sandbox payment page (simulate success/fail, then redirect to frontend). |
| GET | /health | Health check. |

---

## 3. How frontend and backend are connected

- **Base URL:** Frontend uses `VITE_API_URL` (or default `http://localhost:5000`) in `services/checkoutApi.ts` for all API calls.
- **CORS:** Backend enables CORS so the React app can call the API from another origin (e.g. port 3000).
- **Flow:** Customer clicks “Payment + Shipment (API)” in Cart → App shows CheckoutPage → user submits form → frontend calls POST /api/orders then POST /api/payment/create with return_url → redirects to payment URL (sandbox at http://localhost:5000/sandbox-pay) → user clicks Success/Fail → sandbox calls POST /api/payment/callback and redirects to frontend with ?orderId=...&payment=success|failed → App shows CheckoutReturnPage → polls GET /api/orders/:id until paid → calls POST /api/shipment/create → shows “Order confirmed.”

---

## 4. Payment flow

1. CheckoutPage: user fills recipient_name, address, city, phone, weight; amount from cart.
2. Frontend: POST /api/orders → get order id. POST /api/payment/create (orderId, amount, return_url) → get paymentUrl.
3. Redirect to paymentUrl (e.g. http://localhost:5000/sandbox-pay?orderId=...&amount=...&return_url=...).
4. Sandbox: user clicks “Pay (Success)” → POST /api/payment/callback (orderId, success) → backend sets order to paid → redirect to return_url?orderId=...&payment=success.
5. Frontend: loads with orderId and payment=success → CheckoutReturnPage polls GET /api/orders/:id until status=paid → then creates shipment and shows confirmation.

---

## 5. Shipment API integration

- **When:** After CheckoutReturnPage sees order status `paid`, it calls POST /api/shipment/create with the order’s recipient_name, address, city, phone, weight.
- **Backend:** shipmentController validates all fields and weight > 0. shipmentService: fetches order from Supabase; POSTs to `https://apisv2.logestechs.com/api/shipments` with headers `company-id: 634` and `Content-Type: application/json`, body { recipient_name, address, city, phone, weight }; reads shipment_id and shipment_status from response (id/shipment_id/shipmentId, status/shipment_status); updates order in Supabase with shipment_id and shipment_status; returns order and shipment to frontend.
- **Frontend:** Displays “Order confirmed” with orderId, payment status, shipment_id and shipment_status.

---

## 6. Validation and error handling

- **Backend:** All controllers validate required fields and types (e.g. weight > 0). try/catch in controllers; services return { data, error } or { success, error }. Console logs for debugging.
- **Frontend:** CheckoutPage validates form before submit; loading and error states; CheckoutReturnPage handles payment_failed, timeout, and shipment errors with user feedback.

---

## 7. Confirmation

The system is ready for end-to-end testing with:

- **Sandbox payment link:** Set `SANDBOX_PAYMENT_URL=http://localhost:5000/sandbox-pay` and run the backend; frontend redirects to this page and back with payment result.
- **LogesTechs shipment API:** Used with company-id 634 (or LOGESTECHS_COMPANY_ID); all required fields validated; shipment_id and shipment_status read from response and saved to the order.
- **No real bank credentials** are required; the sandbox and POST /api/payment/callback provide simulation for testing.

Run backend from `server/` with `.env` and Supabase `orders` table in place; set frontend `VITE_API_URL` to the backend URL; use “Payment + Shipment (API)” from the cart to run the full flow.
