/**
 * Arabic Bank payment module – environment configuration.
 * All sensitive values from env; validated when creating session or handling webhook.
 */

function get(key: string): string {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? v.trim() : '';
}

export function getArabicBankConfig(): {
  apiUrl: string;
  merchantId: string;
  secretKey: string;
} | null {
  const apiUrl = get('ARABIC_BANK_API_URL');
  const merchantId = get('ARABIC_BANK_MERCHANT_ID');
  const secretKey = get('ARABIC_BANK_SECRET_KEY');
  if (!apiUrl || !merchantId || !secretKey) return null;
  return { apiUrl, merchantId, secretKey };
}

export const ordersTable = ((): string => {
  const v = process.env.ORDERS_TABLE;
  return v != null && String(v).trim() !== '' ? v.trim() : 'orders';
})();
