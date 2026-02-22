-- =============================================================================
-- Multi-user: carts, cart_items, admin_product_messages
-- Run after main setup.sql and schema-follow-interaction.sql
-- =============================================================================

-- One cart per user (customer); used for logged-in cart persistence
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

-- Cart items: product + quantity + price snapshot per cart
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

-- Optional: admin/merchant messages about a product (e.g. approval notes, questions)
CREATE TABLE IF NOT EXISTS public.admin_product_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_product_messages_product_id ON public.admin_product_messages(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_product_messages_from_user ON public.admin_product_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_product_messages_to_user ON public.admin_product_messages(to_user_id);
