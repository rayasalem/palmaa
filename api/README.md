# api/ – Frontend API Layer

## Purpose

The `api/` folder provides the **base HTTP client** for all backend requests. It centralizes:

- API base URL (from env or default)
- Credentials (`include` for cookies)
- JSON Content-Type
- Response parsing and error handling

All services (`authService`, `cartApi`, `checkoutApi`, etc.) should use `api/client.ts` rather than calling `fetch` directly.

---

## Functions

### `api<T>(path, options)`

- **Role**: Performs authenticated JSON request to backend. Single entry point for API calls.
- **Params**:
  - `path`: Relative path (e.g. `/api/auth/login`) or absolute URL.
  - `options`: Standard `RequestInit` (method, body, headers). Credentials and Content-Type are merged automatically.
- **Returns**: Parsed JSON as type `T`.
- **Throws**: `Error` with message from response body (`error` or `message` field) or `HTTP {status}`.
- **Key logic**: Uses `credentials: 'include'` so JWT cookie is sent; expects JSON response.

### `buildUrl(path)`

- **Role**: Builds full URL. If path starts with `http`, returns as-is; otherwise prepends `API_BASE`.
- **Params**: `path` – relative or absolute path.
- **Returns**: Full URL string.

### `mergeHeaders(options)`

- **Role**: Merges default headers (Content-Type, credentials) with caller options. Caller headers override defaults.

### `parseJson(res)`

- **Role**: Parses response body as JSON. Returns `{}` on parse failure (avoids unhandled rejection).

### `getErrorMessage(data, status)`

- **Role**: Extracts user-facing error message from response body. Tries `error`, then `message`, then `HTTP {status}`.

---

## Key Lines

- **Line 15–17** (`API_BASE`): Reads `VITE_API_URL` from Vite env; falls back to `http://localhost:5000` for local dev.
- **Line 47** (`credentials: 'include'`): Ensures cookies (e.g. JWT) are sent with every request for auth.
- **Line 54** (`parseJson`): Catches JSON parse errors and returns `{}` so downstream logic doesn’t crash.
- **Line 60** (`throw new Error`): Caller can `catch (e)` and use `e.message` for UI feedback.

---

## Dependencies

- **Uses**: Vite `import.meta.env` (frontend only).
- **Used by**: `services/authService`, `services/cartApi`, `services/checkoutApi`, `services/interactionApi`, etc.

---

## Usage Example

```ts
import { api } from './api/client';

const data = await api<{ success: boolean; user: User }>('/api/auth/me');
// or with POST:
const result = await api<{ cart: Cart }>('/api/cart/items', {
  method: 'POST',
  body: JSON.stringify({ product_id: 'PRD-xxx', quantity: 1 }),
});
```
