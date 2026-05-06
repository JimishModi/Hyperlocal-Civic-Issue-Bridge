/**
 * Central API configuration.
 * All fetch calls MUST use API_BASE — never hardcode localhost.
 */
import i18n from '../i18n/index.js'

export const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Convenience wrapper around fetch that:
 *  1. Prepends API_BASE to the path
 *  2. Sets JSON headers for non-FormData bodies
 *  3. Sends the current language as X-User-Language header
 *  4. Throws on non-2xx responses with the server error message
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const headers = { ...options.headers };

  // Always send the user's selected language
  headers['X-User-Language'] = i18n.language?.substring(0, 2) || 'en';

  // Don't set Content-Type for FormData — the browser will set multipart boundary
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errorMsg;
    try {
      const err = await res.json();
      errorMsg = err.detail || err.message || JSON.stringify(err);
    } catch {
      errorMsg = res.statusText;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
