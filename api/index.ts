/**
 * API layer: re-exports the base client for use by services.
 */

export { api, API_BASE, getApiBase, getAuthToken, setAuthToken, getAuthHeaders, isSameOrigin } from './client';
