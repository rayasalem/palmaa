
-- =============================================================================
-- PALMA MVP DATABASE SETUP SCRIPT
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE CREATION & MIGRATION
-- =============================================================================

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MERCHANT', 'BROKER', 'CUSTOMER')),
    status TEXT DEFAULT 'PENDING',
    is_approved BOOLEAN DEFAULT FALSE,
    password TEXT,
    verification_code TEXT, 
    verification_code_expiry BIGINT,
    email_verified BOOLEAN DEFAULT FALSE,
    city TEXT,
    company_name TEXT,
    university TEXT,
    logo_url TEXT,
    profile_image TEXT,
    bio TEXT,
    balance NUMERIC DEFAULT 0,
    clicks INT DEFAULT 0,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    terms_version TEXT
);

-- MIGRATION: Ensure columns exist if table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE public.users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_code') THEN
        ALTER TABLE public.users ADD COLUMN verification_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_code_expiry') THEN
        ALTER TABLE public.users ADD COLUMN verification_code_expiry BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'terms_accepted') THEN
        ALTER TABLE public.users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'terms_accepted_at') THEN
        ALTER TABLE public.users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'terms_version') THEN
        ALTER TABLE public.users ADD COLUMN terms_version TEXT;
    END IF;
END $$;

-- MERCHANT PROFILES
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT,
    phone TEXT,
    city TEXT,
    city_id INT,
    village_id INT,
    region_id INT,
    business_address TEXT,
    business_description TEXT,
    logo_url TEXT
);

-- Add Unique Constraint to user_id for Upsert capability (Fixes 409 Errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_profiles_user_id_key') THEN
        ALTER TABLE public.merchant_profiles ADD CONSTRAINT merchant_profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT ('PRD-' || substring(uuid_generate_v4()::text, 1, 8)),
    merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all product columns exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT; 
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_ils NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('ORD-' || substring(uuid_generate_v4()::text, 1, 8)),
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING',
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    payment_method TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    delivery_id TEXT,
    delivery_status TEXT,
    barcode_image TEXT,
    shipment_cost NUMERIC,
    tracking_number TEXT,
    expected_delivery_date TIMESTAMPTZ,
    awb_url TEXT,
    destination_city_id INT,
    destination_village_id INT,
    destination_region_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT ('ITM-' || substring(uuid_generate_v4()::text, 1, 8)),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price NUMERIC NOT NULL
);

-- WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id TEXT PRIMARY KEY DEFAULT ('WTH-' || substring(uuid_generate_v4()::text, 1, 8)),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING',
    date TIMESTAMPTZ DEFAULT NOW()
);

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS public.commissions (
    id TEXT PRIMARY KEY DEFAULT ('COM-' || substring(uuid_generate_v4()::text, 1, 8)),
    broker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING',
    date TIMESTAMPTZ DEFAULT NOW()
);

-- SHARED PRODUCTS
CREATE TABLE IF NOT EXISTS public.shared_products (
    id TEXT PRIMARY KEY DEFAULT ('SHR-' || substring(uuid_generate_v4()::text, 1, 8)),
    broker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    marketing_title TEXT,
    marketing_description TEXT,
    custom_discount_text TEXT,
    clicks INT DEFAULT 0,
    sales INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY DEFAULT ('REV-' || substring(uuid_generate_v4()::text, 1, 8)),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    rating NUMERIC NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT ('TRX-' || substring(uuid_generate_v4()::text, 1, 8)),
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS public.follows (
    id TEXT PRIMARY KEY DEFAULT ('FLW-' || substring(uuid_generate_v4()::text, 1, 8)),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
    id TEXT PRIMARY KEY DEFAULT ('LKE-' || substring(uuid_generate_v4()::text, 1, 8)),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY DEFAULT ('CMT-' || substring(uuid_generate_v4()::text, 1, 8)),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CARTS (one per user for logged-in cart persistence)
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- CART ITEMS (product + quantity + price per cart)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- =============================================================================
-- 2. SECURITY & PERMISSIONS
-- =============================================================================

-- Disable RLS for Tables (Custom Auth via Table)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- =============================================================================
-- 3. STORAGE SETUP
-- =============================================================================

-- Attempt to create the 'products' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DO $$
BEGIN
    -- PRODUCTS BUCKET POLICIES
    BEGIN DROP POLICY "Public Access Products" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DROP POLICY "Authenticated Upload Products" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING ( bucket_id = 'products' );
    CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'products' );
    
    -- PROFILES BUCKET POLICIES
    BEGIN DROP POLICY "Public Access Profiles" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DROP POLICY "Authenticated Upload Profiles" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;

    CREATE POLICY "Public Access Profiles" ON storage.objects FOR SELECT USING ( bucket_id = 'profiles' );
    CREATE POLICY "Authenticated Upload Profiles" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'profiles' );
END $$;

-- =============================================================================
-- 4. CRITICAL: RELOAD SCHEMA CACHE (Fixes PGRST204)
-- =============================================================================
NOTIFY pgrst, 'reload schema';

