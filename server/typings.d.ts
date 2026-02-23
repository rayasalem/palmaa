/**
 * Declarations for JS modules and packages used by server/auth (TypeScript).
 * Allows `npm run build` (tsc) to succeed on Render without adding types for every .js file.
 */
declare module '../../services/authService.js';
declare module '../../services/jwtService.js';
declare module '../../utils/logger.js';
declare module '../middlewares/security.js';
declare module '../middlewares/authMiddleware.js';
declare module '../../config/supabaseClient.js';
declare module 'bcrypt';
