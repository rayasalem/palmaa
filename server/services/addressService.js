/**
 * Address service: fetch cities and villages (e.g. from LogesTechs or external API).
 * Caches results in memory; cache TTL configurable via ADDRESS_CACHE_TTL_MS (default 5 min).
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import { withCircuitBreaker } from '../utils/circuitBreaker.js';

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

const COMPANY_ID = process.env.LOGESTECHS_COMPANY_ID || '634';

/**
 * Call LogesTechs address API. Uses company-id header and optional companyId in path to match Postman.
 * Ref: https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis
 *      https://www.postman.com/ali-asfour/logestech-s-api/request/prrjuvs/get-villages-districts
 */
async function fetchFromApi(path, params = {}) {
  if (!SHIPMENT_API_BASE || !String(SHIPMENT_API_BASE).trim()) return null;
  const base = SHIPMENT_API_BASE.replace(/\/$/, '');
  const headers = { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' };
  const tryUrl = (p, q = {}) => {
    const u = new URL(p, base + '/');
    Object.entries(q).forEach(([k, v]) => {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    });
    return u.toString();
  };
  const url = tryUrl(path, params);
  const { data, error } = await withCircuitBreaker(
    'address',
    () => axios.get(url, { headers, timeout: 8000 }),
    { timeoutMs: 8000 }
  );
  if (error) {
    logger.error('addressService API error', { path, message: error.message });
    return null;
  }
  return data?.data ?? data;
}

/** Extract array from API response (multiple common shapes). */
function extractArray(raw) {
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.data) && raw.data.length > 0) return raw.data;
  if (Array.isArray(raw.result) && raw.result.length > 0) return raw.result;
  if (Array.isArray(raw.districts) && raw.districts.length > 0) return raw.districts;
  if (Array.isArray(raw.villages) && raw.villages.length > 0) return raw.villages;
  if (Array.isArray(raw.items) && raw.items.length > 0) return raw.items;
  return null;
}

/** Try several paths; return first non-empty result. */
async function fetchFromApiWithFallbackPaths(paths, params = {}) {
  for (const path of paths) {
    const raw = await fetchFromApi(path, params);
    const list = extractArray(raw);
    if (list && list.length > 0) return list;
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

/** Fallback villages by cityId when API is not configured or fails. قرى فلسطينية حسب المحافظة. */
const FALLBACK_VILLAGES_BY_CITY = {
  // رام الله والبيرة
  1: [
    { id: '101', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '1' },
    { id: '102', name: 'البيرة', nameAr: 'البيرة', nameEn: 'Al-Bireh', cityId: '1' },
    { id: '103', name: 'بيتونيا', nameAr: 'بيتونيا', nameEn: 'Bitunia', cityId: '1' },
    { id: '104', name: 'بيرزيت', nameAr: 'بيرزيت', nameEn: 'Birzeit', cityId: '1' },
    { id: '105', name: 'رامون', nameAr: 'رامون', nameEn: 'Ramun', cityId: '1' },
    { id: '106', name: 'سلواد', nameAr: 'سلواد', nameEn: 'Silwad', cityId: '1' },
    { id: '107', name: 'عين يبرود', nameAr: 'عين يبرود', nameEn: 'Ain Yabrud', cityId: '1' },
    { id: '108', name: 'دير دبوان', nameAr: 'دير دبوان', nameEn: 'Deir Dibwan', cityId: '1' },
    { id: '109', name: 'المزرعة الشرقية', nameAr: 'المزرعة الشرقية', nameEn: 'Al-Mazraa Ash-Sharqiya', cityId: '1' },
    { id: '110', name: 'ترمسعيا', nameAr: 'ترمسعيا', nameEn: 'Turmusaya', cityId: '1' },
    { id: '111', name: 'سنجل', nameAr: 'سنجل', nameEn: 'Sinjil', cityId: '1' },
    { id: '112', name: 'ابوديس', nameAr: 'ابوديس', nameEn: 'Abu Dis', cityId: '1' },
    { id: '113', name: 'العيزرية', nameAr: 'العيزرية', nameEn: 'Al-Eizariya', cityId: '1' },
  ],
  // نابلس — قرى وبلدات قضاء نابلس
  2: [
    { id: '201', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '2' },
    { id: '202', name: 'رفيديا', nameAr: 'رفيديا', nameEn: 'Rafidia', cityId: '2' },
    { id: '203', name: 'بلاطة', nameAr: 'بلاطة', nameEn: 'Balata', cityId: '2' },
    { id: '204', name: 'عصيرة الشمالية', nameAr: 'عصيرة الشمالية', nameEn: 'Asira ash-Shamaliya', cityId: '2' },
    { id: '205', name: 'عصيرة القبلية', nameAr: 'عصيرة القبلية', nameEn: 'Asira al-Qibliya', cityId: '2' },
    { id: '206', name: 'بيت فوريك', nameAr: 'بيت فوريك', nameEn: 'Beit Furik', cityId: '2' },
    { id: '207', name: 'بيت دجن', nameAr: 'بيت دجن', nameEn: 'Beit Dajan', cityId: '2' },
    { id: '208', name: 'سبسطية', nameAr: 'سبسطية', nameEn: 'Sebastia', cityId: '2' },
    { id: '209', name: 'برقة', nameAr: 'برقة', nameEn: 'Burqa', cityId: '2' },
    { id: '210', name: 'جنصافوت', nameAr: 'جنصافوت', nameEn: 'Jinsafut', cityId: '2' },
    { id: '211', name: 'بزاريا', nameAr: 'بزاريا', nameEn: 'Bazariya', cityId: '2' },
    { id: '212', name: 'حوارة', nameAr: 'حوارة', nameEn: 'Hawara', cityId: '2' },
    { id: '213', name: 'عقربا', nameAr: 'عقربا', nameEn: 'Aqraba', cityId: '2' },
    { id: '214', name: 'تل', nameAr: 'تل', nameEn: 'Tall', cityId: '2' },
    { id: '215', name: 'دير استيا', nameAr: 'دير استيا', nameEn: 'Deir Istiya', cityId: '2' },
    { id: '216', name: 'بيت إيبا', nameAr: 'بيت إيبا', nameEn: 'Beit Iba', cityId: '2' },
    { id: '217', name: 'دير بلوط', nameAr: 'دير بلوط', nameEn: 'Deir Ballut', cityId: '2' },
    { id: '218', name: 'روجيب', nameAr: 'روجيب', nameEn: 'Rujeib', cityId: '2' },
    { id: '219', name: 'بورين', nameAr: 'بورين', nameEn: 'Burin', cityId: '2' },
    { id: '220', name: 'كفر قليل', nameAr: 'كفر قليل', nameEn: 'Kafr Qallil', cityId: '2' },
    { id: '221', name: 'قبلان', nameAr: 'قبلان', nameEn: 'Qabalan', cityId: '2' },
    { id: '222', name: 'عوريف', nameAr: 'عوريف', nameEn: 'Awarta', cityId: '2' },
    { id: '223', name: 'الساوية', nameAr: 'الساوية', nameEn: 'As-Sawiya', cityId: '2' },
    { id: '224', name: 'حارس', nameAr: 'حارس', nameEn: 'Haris', cityId: '2' },
    { id: '225', name: 'كفر قدوم', nameAr: 'كفر قدوم', nameEn: 'Kafr Qaddum', cityId: '2' },
    { id: '226', name: 'جماعين', nameAr: 'جماعين', nameEn: 'Jammain', cityId: '2' },
    { id: '227', name: 'عورتا', nameAr: 'عورتا', nameEn: 'Urif', cityId: '2' },
    { id: '228', name: 'بيتا', nameAr: 'بيتا', nameEn: 'Beita', cityId: '2' },
    { id: '229', name: 'عقابا', nameAr: 'عقابا', nameEn: 'Aqaba', cityId: '2' },
    { id: '230', name: 'الزاوية', nameAr: 'الزاوية', nameEn: 'Az-Zawiya', cityId: '2' },
    { id: '231', name: 'كفر الديك', nameAr: 'كفر الديك', nameEn: 'Kafr ad-Dik', cityId: '2' },
    { id: '234', name: 'نصف جبيل', nameAr: 'نصف جبيل', nameEn: 'Nisf Jubeil', cityId: '2' },
    { id: '235', name: 'مردة', nameAr: 'مردة', nameEn: 'Marda', cityId: '2' },
    { id: '237', name: 'ياسوف', nameAr: 'ياسوف', nameEn: 'Yasuf', cityId: '2' },
    { id: '238', name: 'طوباس', nameAr: 'طوباس', nameEn: 'Tubas', cityId: '2' },
    { id: '239', name: 'طمون', nameAr: 'طمون', nameEn: 'Tammun', cityId: '2' },
    { id: '240', name: 'سلفيت', nameAr: 'سلفيت', nameEn: 'Salfit', cityId: '2' },
  ],
  // الخليل
  3: [
    { id: '301', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '3' },
    { id: '302', name: 'دورا', nameAr: 'دورا', nameEn: 'Dura', cityId: '3' },
    { id: '303', name: 'الظاهرية', nameAr: 'الظاهرية', nameEn: 'Ad-Dhahiriya', cityId: '3' },
    { id: '304', name: 'يطا', nameAr: 'يطا', nameEn: 'Yatta', cityId: '3' },
    { id: '305', name: 'حلحول', nameAr: 'حلحول', nameEn: 'Halhul', cityId: '3' },
    { id: '306', name: 'بني نعيم', nameAr: 'بني نعيم', nameEn: 'Bani Naim', cityId: '3' },
    { id: '307', name: 'السموع', nameAr: 'السموع', nameEn: 'As-Samu', cityId: '3' },
    { id: '308', name: 'ترقوميا', nameAr: 'ترقوميا', nameEn: 'Tarqumiya', cityId: '3' },
    { id: '309', name: 'نوبا', nameAr: 'نوبا', nameEn: 'Nuba', cityId: '3' },
    { id: '310', name: 'الخضر', nameAr: 'الخضر', nameEn: 'Al-Khader', cityId: '3' },
  ],
  // جنين
  4: [
    { id: '401', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '4' },
    { id: '402', name: 'يعبد', nameAr: 'يعبد', nameEn: 'Yaabad', cityId: '4' },
    { id: '403', name: 'عرابة', nameAr: 'عرابة', nameEn: 'Arraba', cityId: '4' },
    { id: '404', name: 'سيلة الظهر', nameAr: 'سيلة الظهر', nameEn: 'Sila al-Harithiya', cityId: '4' },
    { id: '405', name: 'ميثلون', nameAr: 'ميثلون', nameEn: 'Meithalun', cityId: '4' },
    { id: '406', name: 'جبع', nameAr: 'جبع', nameEn: 'Jaba', cityId: '4' },
    { id: '407', name: 'كفردان', nameAr: 'كفردان', nameEn: 'Kafr Dan', cityId: '4' },
    { id: '408', name: 'برقين', nameAr: 'برقين', nameEn: 'Burqin', cityId: '4' },
  ],
  // طولكرم
  5: [
    { id: '501', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '5' },
    { id: '502', name: 'عنبتا', nameAr: 'عنبتا', nameEn: 'Anabta', cityId: '5' },
    { id: '503', name: 'ذنابة', nameAr: 'ذنابة', nameEn: 'Dannaba', cityId: '5' },
    { id: '504', name: 'باقة الشرقية', nameAr: 'باقة الشرقية', nameEn: 'Baqa ash-Sharqiya', cityId: '5' },
    { id: '505', name: 'شويكة', nameAr: 'شويكة', nameEn: 'Shuweika', cityId: '5' },
    { id: '506', name: 'قفين', nameAr: 'قفين', nameEn: 'Qaffin', cityId: '5' },
    { id: '507', name: 'زيتا', nameAr: 'زيتا', nameEn: 'Zeita', cityId: '5' },
  ],
  // بيت لحم
  6: [
    { id: '601', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '6' },
    { id: '602', name: 'بيت جالا', nameAr: 'بيت جالا', nameEn: 'Beit Jala', cityId: '6' },
    { id: '603', name: 'بيت ساحور', nameAr: 'بيت ساحور', nameEn: 'Beit Sahour', cityId: '6' },
    { id: '604', name: 'الخضر', nameAr: 'الخضر', nameEn: 'Al-Khader', cityId: '6' },
    { id: '605', name: 'العبيدية', nameAr: 'العبيدية', nameEn: 'Al-Ubeidiya', cityId: '6' },
    { id: '606', name: 'تقوع', nameAr: 'تقوع', nameEn: 'Tuqu', cityId: '6' },
  ],
  // أريحا
  7: [
    { id: '701', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '7' },
    { id: '702', name: 'العوجا', nameAr: 'العوجا', nameEn: 'Al-Auja', cityId: '7' },
    { id: '703', name: 'النويعمة', nameAr: 'النويعمة', nameEn: 'An-Nuwayma', cityId: '7' },
    { id: '704', name: 'عين السلطان', nameAr: 'عين السلطان', nameEn: 'Ain as-Sultan', cityId: '7' },
    { id: '705', name: 'القلط', nameAr: 'القلط', nameEn: 'Al-Qilt', cityId: '7' },
    { id: '706', name: 'فصايل', nameAr: 'فصايل', nameEn: 'Fasa\'il', cityId: '7' },
    { id: '707', name: 'الجفتلك', nameAr: 'الجفتلك', nameEn: 'Al-Jiftlik', cityId: '7' },
    { id: '708', name: 'الزبيدات', nameAr: 'الزبيدات', nameEn: 'Az-Zubaidat', cityId: '7' },
    { id: '709', name: 'مرج الغزال', nameAr: 'مرج الغزال', nameEn: 'Marj al-Ghazal', cityId: '7' },
    { id: '710', name: 'وادي القلط', nameAr: 'وادي القلط', nameEn: 'Wadi al-Qilt', cityId: '7' },
  ],
  8: [
    { id: '801', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '8' },
    { id: '802', name: 'جباليا', nameAr: 'جباليا', nameEn: 'Jabalia', cityId: '8' },
    { id: '803', name: 'خان يونس', nameAr: 'خان يونس', nameEn: 'Khan Yunis', cityId: '8' },
    { id: '804', name: 'رفح', nameAr: 'رفح', nameEn: 'Rafah', cityId: '8' },
    { id: '805', name: 'دير البلح', nameAr: 'دير البلح', nameEn: 'Deir al-Balah', cityId: '8' },
  ],
  9: [
    { id: '901', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '9' },
    { id: '902', name: 'عبسان الكبيرة', nameAr: 'عبسان الكبيرة', nameEn: 'Abasan al-Kabira', cityId: '9' },
    { id: '903', name: 'بنى سهيلا', nameAr: 'بنى سهيلا', nameEn: 'Bani Suheila', cityId: '9' },
  ],
  10: [
    { id: '1001', name: 'مركز المدينة', nameAr: 'مركز المدينة', nameEn: 'City Center', cityId: '10' },
    { id: '1002', name: 'الشوكة', nameAr: 'الشوكة', nameEn: 'Ash-Shuka', cityId: '10' },
    { id: '1003', name: 'تل السلطان', nameAr: 'تل السلطان', nameEn: 'Tel as-Sultan', cityId: '10' },
  ],
};

/**
 * Get list of cities. Returns cached data if valid. Never returns empty: uses fallback if API fails.
 * @returns {Promise<Array<{ id: string, name: string, regionId?: string }>>}
 */
async function getCities() {
  if (isCacheValid(cache.citiesAt) && Array.isArray(cache.cities) && cache.cities.length > 0) {
    return cache.cities;
  }
  // نستخدم قائمة المحافظات الفلسطينية المحلية دائماً لسهولة الفهم للزائر
  cache.cities = FALLBACK_CITIES;
  cache.citiesAt = Date.now();
  return cache.cities;
}

function normalizeCityList(arr) {
  return (arr || []).map((c) => ({
    id: String(c.id ?? c.cityId ?? c.city_id ?? ''),
    // فضّل الاسم العربي إن وُجد، ثم الاسم العام، ثم الإنجليزي
    name: c.nameAr || c.name || c.nameEn || '',
    nameAr: c.nameAr || c.name || c.nameEn || '',
    nameEn: c.nameEn || c.name || c.nameAr || '',
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
    // فضّل الاسم العربي إن وُجد، ثم الاسم العام، ثم الإنجليزي
    name: v.nameAr || v.name || v.nameEn || '',
    nameAr: v.nameAr || v.name || v.nameEn || '',
    nameEn: v.nameEn || v.name || v.nameAr || '',
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
  // نستخدم القرى الفلسطينية المحلية دائماً؛ لا نعتمد على أسماء/أكواد خارجية للواجهة
  let list = [];
  if (cityId) {
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

const districtsVillagesCache = { data: null, at: 0 };

/**
 * Get all districts (محافظات) and villages (قرى) in one call when possible.
 * Tries LogesTechs "Get Villages/Districts" API first: GET guests/villages-districts
 * Ref: https://www.postman.com/ali-asfour/logestech-s-api/request/prrjuvs/get-villages-districts
 * @returns {{ districts: Array<{id, name, regionId?}>, villages: Array<{id, name, cityId, regionId?}> }}
 */
async function getDistrictsAndVillages() {
  if (districtsVillagesCache.data && isCacheValid(districtsVillagesCache.at)) {
    return districtsVillagesCache.data;
  }
  // إرجاع جميع المحافظات والقرى الفلسطينية من القوائم المحلية
  const districts = FALLBACK_CITIES;
  const villages = Object.values(FALLBACK_VILLAGES_BY_CITY).flat();
  const result = { districts, villages };
  districtsVillagesCache.data = result;
  districtsVillagesCache.at = Date.now();
  return result;
}

export { getCities, getVillages, getDistrictsAndVillages };
