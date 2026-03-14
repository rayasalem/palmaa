-- Basic gamification tables: user_points and referrals.
-- Non-breaking: all columns are optional and used only by new services.

CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  loyalty_level TEXT NOT NULL DEFAULT 'BRONZE',
  referred_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_points IS 'Accumulated points and loyalty level per user (for gamification).';
COMMENT ON COLUMN public.user_points.total_points IS 'Total gamification points for this user.';
COMMENT ON COLUMN public.user_points.loyalty_level IS 'Simple tier: BRONZE, SILVER, GOLD.';
COMMENT ON COLUMN public.user_points.referred_by IS 'User who referred this user (if any).';

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rewarded_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE public.referrals IS 'Referral rewards per referrer/referred pair, optionally tied to an order.';
COMMENT ON COLUMN public.referrals.status IS 'PENDING, REWARDED, CANCELLED.';

