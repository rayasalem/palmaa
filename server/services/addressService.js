/**
 * Address service: fetch cities and villages (e.g. from LogesTechs or external API).
 * Caches results in memory; cache TTL configurable via ADDRESS_CACHE_TTL_MS (default 5 min).
 */

import axios from 'axios';

const SHIPMENT_API_BASE = process.env.SHIPMENT_API_BASE || process.env.LOGESTECHS_API_URL || '';
const CACHE_TTL_MS = Number(process.env.ADDRESS_CACHE_TTL_MS) || 5 * 60 * 1000; // 5 min

const cache = {
  cities: null,
  citiesAt: 0,
  villages: {}, // key: cityId or 'all', value: { data, at }
};

function isCacheValid(at) {
  return at && Date.now() - at < CACHE_TTL_MS;
}

async function fetchFromApi(path, params = {}) {
  if (!SHIPMENT_API_BASE) return null;
  const companyId = process.env.LOGESTECHS_COMPANY_ID || '634';
  try {
    const url = new URL(path, SHIPMENT_API_BASE.replace(/\/$/, '') + '/');
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') url.searchParams.set(k, v);
    });
    const response = await axios.get(url.toString(), {
      headers: { 'company-id': companyId, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    console.error('[addressService] API error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Get list of cities. Returns cached data if valid.
 * @returns {Promise<Array<{ id: string, name: string, regionId?: string }>>}
 */
async function getCities() {
  if (isCacheValid(cache.citiesAt) && Array.isArray(cache.cities)) {
    return cache.cities;
  }
  const raw = await fetchFromApi('addresses/cities');
  if (Array.isArray(raw)) {
    cache.cities = raw;
    cache.citiesAt = Date.now();
    return cache.cities;
  }
  if (raw && Array.isArray(raw.data)) {
    cache.cities = raw.data;
    cache.citiesAt = Date.now();
    return cache.cities;
  }
  if (!SHIPMENT_API_BASE) {
    // Mock data for development when no API configured
    cache.cities = [
      { id: 'city-1', name: 'City A', regionId: 'reg-1' },
      { id: 'city-2', name: 'City B', regionId: 'reg-1' },
    ];
    cache.citiesAt = Date.now();
    return cache.cities;
  }
  return [];
}

/**
 * Get villages (districts), optionally filtered by cityId and search.
 * @param {string} [search] - Search term
 * @param {string} [cityId] - Filter by city
 * @returns {Promise<Array<{ id: string, name: string, cityId?: string, regionId?: string }>>}
 */
async function getVillages(search, cityId) {
  const cacheKey = cityId || 'all';
  const cached = cache.villages[cacheKey];
  if (cached && isCacheValid(cached.at)) {
    let list = cached.data;
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((v) => (v.name || '').toLowerCase().includes(s));
    }
    return list;
  }
  const raw = await fetchFromApi('addresses/villages', { search: search || '', cityId: cityId || '' });
  let list = Array.isArray(raw) ? raw : (raw && raw.data) ? raw.data : [];
  if (!SHIPMENT_API_BASE && list.length === 0) {
    list = [
      { id: 'v1', name: 'Village 1', cityId: 'city-1', regionId: 'reg-1' },
      { id: 'v2', name: 'Village 2', cityId: 'city-1', regionId: 'reg-1' },
      { id: 'v3', name: 'Village 3', cityId: 'city-2', regionId: 'reg-1' },
    ];
  }
  if (cityId) {
    list = list.filter((v) => String(v.cityId || v.city_id) === String(cityId));
  }
  cache.villages[cacheKey] = { data: list, at: Date.now() };
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((v) => (v.name || '').toLowerCase().includes(s));
  }
  return list;
}

export { getCities, getVillages };
