/**
 * Auth service: facade re-exporting from auth/ modules.
 * OTP, registration, login, password reset, verification, and token version are in server/services/auth/.
 */

export {
  generateOtp,
  saveOtp,
  findValidOtp,
  verifyOtp,
  invalidateOtp,
  hashPassword,
  getTokenVersion,
  incrementTokenVersion,
  forgotPassword,
  updatePassword,
  setEmailVerified,
  resendVerification,
  registerUser,
  login,
  getUserById,
} from './auth/index.js';
