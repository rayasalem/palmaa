/**
 * Auth domain constants: table names and config.
 * Used by auth services for Supabase and bcrypt.
 */

export const USERS_TABLE = 'users';
export const OTP_TABLE = 'otp_codes';
export const OTP_EXPIRY_MINUTES = 15;
export const SALT_ROUNDS = 12;
