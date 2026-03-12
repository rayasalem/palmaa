/**
 * Address service: fetch cities and villages (e.g. from LogesTechs or external API).
 * Caches results in memory; cache TTL configurable via ADDRESS_CACHE_TTL_MS (default 5 min).
 */

import axios from 'axios';
import logger from '../utils/logger.js';

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

/**
 * Call LogesTechs address API. Tries multiple paths to match Postman collection.
 * Ref: https://www.postman.com/ali-asfour/logestech-s-api/request/prrjuvs/get-villages-districts
 */
async function fetchFromApi(path, params = {}) {
  if (!SHIPMENT_API_BASE || !String(SHIPMENT_API_BASE).trim()) return null;
  const base = SHIPMENT_API_BASE.replace(/\/$/, '');
  const companyId = process.env.LOGESTECHS_COMPANY_ID || '634';
  const headers = { 'company-id': companyId, 'Content-Type': 'application/json' };
  const tryUrl = (p, q = {}) => {
    const u = new URL(p, base + '/');
    Object.entries(q).forEach(([k, v]) => {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    });
    return u.toString();
  };
  try {
    const url = tryUrl(path, params);
    const response = await axios.get(url, { headers, timeout: 10000 });
    return response.data;
  } catch (err) {
    logger.error('addressService API error', { path, message: (err.response && err.response.data) || err.message });
    return null;
  }
}

/** Try several paths; return first non-empty result. */
async function fetchFromApiWithFallbackPaths(paths, params = {}) {
  for (const path of paths) {
    const raw = await fetchFromApi(path, params);
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (raw && Array.isArray(raw.data) && raw.data.length > 0) return raw.data;
  }
  return null;
}

/** Fallback cities when API is not configured or fails (so dropdowns are never empty). */
const FALLBACK_CITIES = [
  { id: '1', name: 'رام الله', nameAr: 'رام الله', nameEn: 'Ramallah', regionId: '1' },
  { id: '2', name: 'نابلس', nameAr: 'نابلس', nameEn: 'Nablus', regionId: '1' },
  { id: '3', name: 'الخليل', nameAr: 'الخليل', nameEn: 'Hebron', regionId: '1' },
  { id: '4', name: 'جنين', nameAr: 'جنين', nameEn: 'Jenin', regionId: '1' },
  { id: '5', name: 'طولكرم', nameAr: 'طولكرم', nameEn: 'Tulkarm', regionId: '1' },
  { id: '6', name: 'بيت لحم', nameAr: 'بيت لحم', nameEn: 'Bethlehem', regionId: '1' },
  { id: '7', name: 'أريحا', nameAr: 'أريحا', nameEn: 'Jericho', regionId: '1' },
  { id: '8', name: 'غزة', nameAr: 'غزة', nameEn: 'Gaza', regionId: '2' },
  { id: '9', name: 'خان يونس', nameAr: 'خان يونس', nameEn: 'Khan Yunis', regionId: '2' },
  { id: '10', name: 'رفح', nameAr: 'رفح', nameEn: 'Rafah', regionId: '2' },
];

/** Fallback villages by cityId when API is not configured or fails. */
const FALLBACK_VILLAGES_BY_CITY = {
  1: [
    { id: '101', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '1' },
    { id: '102', name: 'البيرة', nameAr: 'البيرة', nameEn: 'Al-Bireh', cityId: '1' },
    { id: '103', name: 'بيتونيا', nameAr: 'بيتونيا', nameEn: 'Bitunia', cityId: '1' },
    { id: '104', name: 'بيرزيت', nameAr: 'بيرزيت', nameEn: 'Birzeit', cityId: '1' },
  ],
  2: [
    { id: '201', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '2' },
    { id: '202', name: 'رفيديا', nameAr: 'رفيديا', nameEn: 'Rafidia', cityId: '2' },
    { id: '203', name: 'بلاطة', nameAr: 'بلاطة', nameEn: 'Balata', cityId: '2' },
  ],
  3: [
    { id: '301', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '3' },
    { id: '302', name: 'دورا', nameAr: 'دورا', nameEn: 'Dura', cityId: '3' },
  ],
  4: [{ id: '401', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '4' }],
  5: [{ id: '501', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '5' }],
  6: [{ id: '601', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '6' }],
  7: [{ id: '701', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '7' }],
  8: [{ id: '801', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '8' }],
  9: [{ id: '901', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '9' }],
  10: [{ id: '1001', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '10' }],
};

/**
 * Get list of cities. Returns cached data if valid. Never returns empty: uses fallback if API fails.
 * @returns {Promise<Array<{ id: string, name: string, regionId?: string }>>}
 */
async function getCities() {
  if (isCacheValid(cache.citiesAt) && Array.isArray(cache.cities) && cache.cities.length > 0) {
    return cache.cities;
  }
  // LogesTechs Postman: try guests/cities then addresses/cities
  const list = await fetchFromApiWithFallbackPaths(['guests/cities', 'addresses/cities']);
  if (list && list.length > 0) {
    cache.cities = normalizeCityList(list);
    cache.citiesAt = Date.now();
    return cache.cities;
  }
  cache.cities = FALLBACK_CITIES;
  cache.citiesAt = Date.now();
  return cache.cities;
}

function normalizeCityList(arr) {
  return (arr || []).map((c) => ({
    id: String(c.id ?? c.cityId ?? c.city_id ?? ''),
    name: c.name || c.nameAr || c.nameEn || '',
    nameAr: c.nameAr || c.name || '',
    nameEn: c.nameEn || c.name || '',
    regionId: c.regionId ?? c.region_id ?? undefined,
  }));
}

/**
 * Get villages (districts), optionally filtered by cityId and search.
 * Never returns empty for a valid cityId: uses fallback when API fails.
 * @param {string} [search] - Search term
 * @param {string} [cityId] - Filter by city
 * @returns {Promise<Array<{ id: string, name: string, cityId?: string, regionId?: string }>>}
 */
function normalizeVillageList(arr, cityId) {
  return (arr || []).map((v) => ({
    id: String(v.id ?? v.villageId ?? v.village_id ?? ''),
    name: v.name || v.nameAr || v.nameEn || '',
    nameAr: v.nameAr || v.name || '',
    nameEn: v.nameEn || v.name || '',
    cityId: String(v.cityId ?? v.city_id ?? cityId ?? ''),
    regionId: v.regionId ?? v.region_id ?? undefined,
  }));
}

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
  const q = { search: search || '', cityId: cityId || '', city_id: cityId || '' };
  // LogesTechs Postman "Get Villages/Districts": try guests/villages, guests/districts, addresses/villages
  const listRaw = await fetchFromApiWithFallbackPaths(
    ['guests/villages', 'guests/districts', 'addresses/villages'],
    q
  );
  let list = listRaw ? normalizeVillageList(listRaw, cityId) : [];

  const usingExternalApi = !!SHIPMENT_API_BASE;
  if (cityId && !usingExternalApi) {
    list = list.filter((v) => String(v.cityId || v.city_id) === String(cityId));
  }
  if (list.length === 0 && cityId) {
    list = FALLBACK_VILLAGES_BY_CITY[String(cityId)] || [
      { id: '0', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: String(cityId) },
    ];
  }
  if (list.length === 0 && !cityId) {
    list = Object.values(FALLBACK_VILLAGES_BY_CITY).flat();
  }
  cache.villages[cacheKey] = { data: list, at: Date.now() };
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((v) => (v.name || '').toLowerCase().includes(s));
  }
  return list;
}

export { getCities, getVillages };
