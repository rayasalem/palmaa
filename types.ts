export enum Role {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  BROKER = 'BROKER',
  ADMIN = 'ADMIN',
}

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'BROKER' | 'ADMIN';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  phone2?: string;
  role: UserRole | Role;
  status?: UserStatus;
  isApproved?: boolean; // Legacy/Compat
  isRejected?: boolean; // Legacy/Compat
  approved_at?: string; // New: Timestamp of approval
  password?: string; // For mock auth
  verificationCode?: string; // New: For email verification
  verificationCodeExpiry?: number; // New: Timestamp for code expiration
  emailVerified?: boolean; // New: Verification status
  avatarUrl?: string;
  createdAt?: number; // Legacy
  registration_date?: string; // New
  city?: string;
  cityId?: number; // New: For dynamic localization
  villageId?: number; // New: For dynamic localization
  bio?: string;
  profile_image?: string;
  companyName?: string;
  university?: string;
  logoUrl?: string;
  balance?: number;
  clicks?: number;
}

export interface MerchantProfile {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  city: string;
  city_id?: number;
  village_id?: number;
  region_id?: number;
  business_address?: string;
  business_description: string;
  logo_url: string;
}

export interface Product {
  id: string;
  merchantId?: string; // Legacy
  merchant_id?: string; // New
  merchantName?: string;
  name: string;
  title?: string; // Alias for name / API compat
  description: string;
  shortDescription?: string;
  price?: number; // Legacy
  price_ils?: number; // New
  discount?: number;
  imageUrl?: string; // Legacy
  image_url?: string; // New
  images?: string[];
  category: string;
  stock: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  isActive?: boolean; // Legacy
  is_bestseller?: boolean; // New
  createdAt?: number; // Legacy
  created_at?: string; // New
  updatedAt?: number;
  /** Product condition (e.g. new, used_like_new, used_good, used_fair, refurbished, open_box, vintage) */
  condition?: string;
  /** خصم: PERCENT = نسبة مئوية، AMOUNT = مبلغ ثابت */
  discount_type?: 'PERCENT' | 'AMOUNT';
  /** قيمة الخصم (نسبة أو مبلغ حسب discount_type) */
  discount_value?: number;
  /** هل الخصم مفعّل */
  is_discount_active?: boolean;
  /** تاريخ بداية الخصم (اختياري) */
  discount_starts_at?: string;
  /** تاريخ انتهاء الخصم (اختياري) */
  discount_ends_at?: string;
  /** السعر بعد الخصم (يُحسب من الباكند أو من discount_* عند العرض) */
  final_price?: number;
  /** نسبة الخصم المعروضة (مثل 20 لـ 20%) */
  discount_percent?: number;
}

export interface SharedProduct {
  id: string;
  broker_id: string;
  product_id: string;
  shared_at: string;
  clicks: number;
  sales: number;
  marketing_title?: string;
  marketing_description?: string;
  custom_discount_text?: string;
  is_featured?: boolean;
}

export interface Review {
  id: string;
  productId?: string;
  product_id?: string;
  userId?: string;
  customer_id?: string;
  userName?: string;
  customer_name?: string;
  rating: number;
  reviewText?: string;
  comment?: string;
  createdAt?: number;
  date?: string;
}

export interface Follow {
  id: string;
  followerId: string; // Customer
  followingId: string; // Merchant or Broker
  createdAt: number;
}

export interface Like {
  id: string;
  userId: string;
  productId: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  userId: string;
  productId: string;
  text: string;
  createdAt: number;
  userName?: string; // Helper for UI display
}

export interface CartItem extends Product {
  quantity: number;
  price: number; // Ensure compatibility
  product_id?: string; // API compat (cart item key)
  productId?: string; // API compat (alternate key)
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_THE_WAY = 'ON_THE_WAY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  /** Legacy / shipment display */
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

/** Allowed next status for merchant (order flow). */
export const ORDER_STATUS_NEXT: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'IN_PROGRESS',
  IN_PROGRESS: 'ON_THE_WAY',
  ON_THE_WAY: 'COMPLETED',
};

export enum PaymentMethod {
  COD = 'COD',
  CREDIT_CARD = 'CREDIT_CARD',
}

export interface Address {
  cityId: number;
  cityName: string;
  villageId?: number;
  villageName?: string;
  addressDetails: string;
  phone: string;
  regionId?: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  productId?: string; // API compat (alternate key)
  quantity: number;
  price: number;
  price_ils?: number; // API compat
}

export interface Order {
  id: string;
  customerId?: string; // Legacy
  customer_id?: string; // New
  merchantId?: string; // Legacy
  merchant_id?: string; // New
  items?: CartItem[]; // Legacy
  totalAmount?: number; // Legacy
  total_price_ils?: number; // New
  status: OrderStatus | string;
  shippingAddress?: Address;
  shipping_address?: string; // New
  shipping_name?: string;
  shipping_phone?: string;
  date?: string;
  payment_method?: PaymentMethod;
  shipmentId?: string;
  delivery_id?: string;
  trackingNumber?: string;
  barcode?: string;
  barcodeImage?: string;
  barcode_image?: string;
  createdAt?: number;
  affiliate_student_id?: string;
  destination_city_id?: number;
  destination_village_id?: number;
  destination_region_id?: number;
  shipment_cost?: number;
  awb_url?: string;
  delivery_status?: string;
  expected_delivery_date?: string;
  /** الفاتورة الضريبية مرفوعة (للدفع الإلكتروني). */
  invoice_uploaded?: boolean;
  /** رابط ملف الفاتورة. */
  invoice_file_url?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  type: 'PAYMENT' | 'REFUND' | 'COMMISSION';
  status: 'COMPLETED' | 'PENDING';
  createdAt: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  date: string;
  is_read: boolean;
  type: 'order' | 'system' | 'promotion';
}

export interface CommissionRecord {
  id: string;
  broker_id: string;
  order_id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'PAID';
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
}

export type CommissionStatus = 'PENDING' | 'PAID';

// FlashLine Types
export type ShipmentType = 'COD' | 'REGULAR' | 'SWAP' | 'BRING';
export type ServiceType = 'STANDARD';
export type PkgUnitType = 'METRIC';

export interface ShipmentBody {
  email?: string;
  password?: string;
  pkgUnitType: PkgUnitType;
  pkg: {
    cod: number;
    notes: string;
    invoiceNumber: string;
    senderName: string;
    receiverName: string;
    businessSenderName: string;
    senderPhone: string;
    senderPhone2?: string;
    receiverPhone: string;
    receiverPhone2?: string;
    quantity: number;
    description: string;
    shipmentType: ShipmentType;
    serviceType: ServiceType;
    toCollectFromReceiver?: number;
  };
  destinationAddress: {
    addressLine1: string;
    addressLine2: string;
    cityId: number;
    villageId: number;
    regionId: number;
  };
  originAddress: {
    addressLine1: string;
    addressLine2: string;
    cityId: number;
    villageId: number;
    regionId: number;
  };
}

export interface FlashlineShipmentResponse {
  success: boolean;
  shipmentId?: string;
  barcode?: string;
  barcodeImage?: string;
  expectedDeliveryDate?: string;
  cost?: number;
  status?: string;
  error?: string;
  payload?: any;
  message?: string;
  trackingNumber?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
  timestamp?: string;
  requiresVerification?: boolean; // New: Signal UI to show verification step
}

/** إيموجي دلالي لكل تصنيف — يُعرض بجانب الاسم في الفلاتر ونموذج المنتج */
export const CATEGORY_EMOJI: Record<string, string> = {
  juices: '🧃',
  soft_drinks: '🥤',
  hot_drinks: '☕',
  water: '💧',
  dairy_drinks: '🥛',
  fruits: '🍎',
  vegetables: '🥬',
  dairy: '🧀',
  bakery: '🥖',
  meat_poultry: '🍗',
  canned_food: '🥫',
  snacks: '🍿',
  sweets: '🍬',
  spices: '🌿',
  grains: '🍚',
  ready_meals: '🍱',
  oils_sauces: '🫒',
  frozen_food: '🧊',
  phones: '📱',
  computers: '💻',
  electronics_accessories: '🔌',
  home_appliances: '🔌',
  cameras: '📷',
  gaming: '🎮',
  men_clothing: '👔',
  women_clothing: '👗',
  kids_clothing: '👶',
  shoes: '👟',
  bags_accessories: '👜',
  traditional_wear: '👘',
  furniture: '🛋️',
  kitchen: '🍳',
  home_decor: '🖼️',
  garden: '🌱',
  tools: '🔧',
  skincare: '🧴',
  makeup: '💄',
  hair_care: '💇',
  perfume: '🌸',
  beauty: '💅',
  fashion: '👕',
  sports: '⚽',
  home: '🏠',
  food: '🍎',
  electronics: '📱',
  handmade: '🧵',
  baby: '🍼',
  pets: '🐾',
  books: '📚',
  automotive: '🚗',
  toys: '🧸',
  furnishings_textiles: '🛏️',
  real_estate: '🏡',
  services: '🔧',
  other: '📦',
};

export const PRODUCT_CATEGORIES = [
  'juices',
  'soft_drinks',
  'hot_drinks',
  'water',
  'dairy_drinks',
  'fruits',
  'vegetables',
  'dairy',
  'bakery',
  'meat_poultry',
  'canned_food',
  'snacks',
  'sweets',
  'spices',
  'grains',
  'ready_meals',
  'oils_sauces',
  'frozen_food',
  'phones',
  'computers',
  'electronics_accessories',
  'home_appliances',
  'cameras',
  'gaming',
  'men_clothing',
  'women_clothing',
  'kids_clothing',
  'shoes',
  'bags_accessories',
  'traditional_wear',
  'furniture',
  'kitchen',
  'home_decor',
  'garden',
  'tools',
  'skincare',
  'makeup',
  'hair_care',
  'perfume',
  'beauty',
  'fashion',
  'sports',
  'home',
  'food',
  'electronics',
  'handmade',
  'baby',
  'pets',
  'books',
  'automotive',
  'toys',
  'furnishings_textiles',
  'real_estate',
  'services',
  'other',
];
