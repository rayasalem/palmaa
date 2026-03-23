/**
 * Example: axios request interceptor when you add `axios` to the project.
 * Rename to .ts and wire in your entry if needed.
 *
 * import axios from 'axios';
 * import { enforceFetchUrlPolicy } from './httpsPolicy';
 *
 * axios.interceptors.request.use((config) => {
 *   const base = config.baseURL ?? '';
 *   const path = config.url ?? '';
 *   const absolute = base ? new URL(path, base).href : path;
 *   if (absolute.startsWith('http')) {
 *     const safe = enforceFetchUrlPolicy(absolute);
 *     if (config.baseURL && path.startsWith('/')) {
 *       config.url = safe.replace(config.baseURL.replace(/\/$/, ''), '') || path;
 *     } else {
 *       config.url = safe;
 *       config.baseURL = undefined;
 *     }
 *   }
 *   return config;
 * });
 */

export {};
