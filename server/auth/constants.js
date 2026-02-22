/**
 * Auth domain constants: table names and config used by auth services.
 * Centralizes values so controllers and services stay in sync with DB schema.
 */

/** Supabase table name for user accounts */
export const USERS_TABLE = 'users';

/** Supabase table name for one-time codes (email verification, password reset) */
export const OTP_TABLE = 'otp_codes';

/** Minutes after which an OTP code expires; used when saving and in email copy */
export const OTP_EXPIRY_MINUTES = 15;

/** bcrypt salt rounds for password hashing; higher = slower but more secure */
export const SALT_ROUNDS = 12;
