/**
 * Jest setup: run before all tests.
 * Sets minimal env so server app can be imported without failing validateEnv().
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-api-tests';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-cookie-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://test.supabase.co';
if (!process.env.SUPABASE_SERVICE_KEY) process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
