-- =============================================================================
-- Merchant: subscriptions, order settlements (transactions), invoice, suspension
-- Run after setup.sql and 003_order_profits_and_broker.sql
-- =============================================================================

-- 1) USERS: subscription fields (default free trial)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_type') THEN
    ALTER TABLE public.users ADD COLUMN subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_start_date') THEN
    ALTER TABLE public.users ADD COLUMN subscription_start_date TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_end_date') THEN
    ALTER TABLE public.users ADD COLUMN subscription_end_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired'));
  END IF;
END $$;

-- Default free trial: 30 days for new merchants (handled in app on first login or register)
-- subscription_end_date NULL = no end (e.g. free forever until we set it)

-- 2) ORDERS: merchant_id, invoice and completion fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);

-- 3) TRANSACTIONS: extend for order settlement (commission, tax penalty, merchant net)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax_penalty_amount NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_net_amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON public.transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);

-- 4) Storage bucket for invoices (optional; can use existing 'profiles' or 'products')
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.users.subscription_type IS 'free | paid';
COMMENT ON COLUMN public.users.subscription_status IS 'active | expired';
COMMENT ON COLUMN public.orders.invoice_uploaded IS 'Tax invoice uploaded for this order (electronic payment)';
COMMENT ON COLUMN public.orders.completed_at IS 'Order completed: delivery + product match confirmed; merchant eligible for payout';
