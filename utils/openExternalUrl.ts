/**
 * Safe external URL opener.
 *
 * Why: prevent cross-origin frame navigation issues and keep UX stable.
 * - Opens in a new tab
 * - Applies `noopener` behavior (no reverse-tabnabbing)
 * - Shows a friendly error if popup is blocked or URL is invalid
 */
export function openExternalUrl(url: string): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const parsed = new URL(url, window.location.href);
    // Only allow http(s) URLs.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      window.alert('Can not open this link right now.');
      return false;
    }

    const win = window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    if (!win) {
      window.alert('Popups are blocked. Please allow popups to open the link.');
      return false;
    }

    // Extra protection for supporting browsers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (win as any).opener = null;
    return true;
  } catch (e) {
    console.error('[openExternalUrl] failed:', e);
    if (typeof window !== 'undefined') window.alert('Unable to open the link right now.');
    return false;
  }
}

