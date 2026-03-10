-- Session invalidation (logout-all) and optional MFA.
-- Safe to run on live DB: new columns have defaults; no data loss.

-- token_version: increment to invalidate all existing JWTs for the user (logout from all devices).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.token_version IS 'Incremented on logout-all; JWT ver claim must match to be valid.';

-- MFA (optional, progressive rollout).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_secret text;

COMMENT ON COLUMN public.users.mfa_enabled IS 'When true, login requires MFA challenge after password.';
COMMENT ON COLUMN public.users.mfa_secret IS 'TOTP secret (encrypted or plain per policy); null when mfa_enabled is false.';
