/**
 * Password hashing using bcrypt. Used on registration and password reset.
 */

import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../constants.js';

/**
 * Hash password with bcrypt for secure storage.
 * @param {string} plainPassword - Raw password from user
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}
