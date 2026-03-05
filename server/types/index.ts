/**
 * Backend shared types: API request/response shapes and DB model types.
 * Re-exported for use in auth and other domains.
 */

// ---------------------------------------------------------------------------
// Generic API response
// ---------------------------------------------------------------------------

/** Standard JSON API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Auth: request bodies (from client)
// ---------------------------------------------------------------------------

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
  role?: string;
  termsAccepted?: boolean;
  termsVersion?: string;
}

export interface VerifyEmailBody {
  email: string;
  otp: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResendVerificationBody {
  email: string;
}

// ---------------------------------------------------------------------------
// Auth: API response payloads (sent to client)
// ---------------------------------------------------------------------------

/** User object as returned by /api/auth/me and /api/auth/login */
export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  is_email_verified?: boolean;
  status?: string;
  phone?: string;
  created_at?: string;
}

export interface AuthMeResponse {
  success: true;
  user: AuthUserResponse;
}

export interface AuthLoginSuccessResponse {
  success: true;
  user: AuthUserResponse;
  message: string;
}

export interface AuthRegisterSuccessResponse {
  success: true;
  message: string;
  user: AuthUserResponse | null;
}

// ---------------------------------------------------------------------------
// Auth: DB row shapes (Supabase)
// ---------------------------------------------------------------------------

/** users table row (selected columns used in auth) */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
  is_email_verified?: boolean;
  status?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
}

/** otp_codes table row */
export interface OtpRow {
  id?: string;
  email: string;
  code: string;
  type: 'email_verification' | 'password_reset';
  expires_at: string;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Express request with optional auth (set by middleware)
// ---------------------------------------------------------------------------

export interface AuthPayload {
  sub: string;
  email?: string;
  role?: string;
}

// ---------------------------------------------------------------------------
// Cart: request bodies and response (multi-user)
// ---------------------------------------------------------------------------

export interface AddCartItemBody {
  product_id: string;
  quantity: number;
}

export interface UpdateCartItemBody {
  quantity: number;
}

/** Single item in cart response (with optional product snapshot) */
export interface CartItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at?: string;
  product?: { id: string; name?: string; image_url?: string; price_ils?: number; condition?: string };
}

/** Full cart response for GET /api/cart */
export interface CartResponse {
  id: string;
  user_id: string;
  items: CartItemResponse[];
  updated_at?: string;
}

/** DB row: cart_items */
export interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at?: string;
}

/** DB row: carts */
export interface CartRow {
  id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Express request with optional auth (set by middleware)
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}
