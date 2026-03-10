/**
 * Auth service modules: re-export for backward compatibility.
 * authService.js imports from here so all existing callers keep working.
 */

import * as otp from './otp.js';
import * as utils from './utils.js';
import * as passwordReset from './passwordReset.js';
import * as verification from './verification.js';
import * as registration from './registration.js';
import * as login from './login.js';

export const { generateOtp, saveOtp, findValidOtp, verifyOtp, invalidateOtp } = otp;
export const { hashPassword, getTokenVersion, incrementTokenVersion } = utils;
export const { forgotPassword, updatePassword } = passwordReset;
export const { setEmailVerified, resendVerification } = verification;
export const { registerUser } = registration;
export const { login: loginFn, getUserById } = login;

export { loginFn as login };
