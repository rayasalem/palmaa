-- =============================================================================
-- Order profits: broker_id on orders, order_profits table for merchant/store/broker
-- Run after orders and order_items exist.
-- =============================================================================

-- Allow linking order to broker when sale came through broker referral
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_broker_id ON public.orders(broker_id);

-- Profit records per order: نصيب التاجر، المتجر، الوسيط
-- party_type: 'merchant' | 'store' | 'broker'
-- party_id: user id for merchant/broker; NULL for store (platform)
CREATE TABLE IF NOT EXISTS public.order_profits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID NULL,
    party_type TEXT NOT NULL CHECK (party_type IN ('merchant', 'store', 'broker')),
    party_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount_ils NUMERIC NOT NULL CHECK (amount_ils >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_profits_order_id ON public.order_profits(order_id);
CREATE INDEX IF NOT EXISTS idx_order_profits_party ON public.order_profits(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_order_profits_created_at ON public.order_profits(created_at);

COMMENT ON TABLE public.order_profits IS 'تسجيل أرباح التاجر (85%)، المتجر (15% أو 12% مع وسيط)، الوسيط (3%) عند إتمام الدفع';
