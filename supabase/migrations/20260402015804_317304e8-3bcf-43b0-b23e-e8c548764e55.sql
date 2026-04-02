
-- ============================================================
-- PHASE 1: Full migration for Resource Bank, Quiz Sharing,
-- Referrals, Reward Expiry, Question Caching
-- ============================================================

-- ========================
-- 1. RESOURCE BANK TABLE
-- ========================
CREATE TABLE public.resource_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('pdf','image','text','docx')),
  country TEXT,
  exam TEXT,
  subject TEXT,
  topic TEXT,
  ai_category TEXT,
  ai_summary TEXT,
  upload_count INTEGER NOT NULL DEFAULT 0,
  test_gen_count INTEGER NOT NULL DEFAULT 0,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resource_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can browse resources"
  ON public.resource_bank FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upload own resources"
  ON public.resource_bank FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resources"
  ON public.resource_bank FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
  ON public.resource_bank FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ========================
-- 2. QUIZ ATTEMPTS TABLE
-- ========================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code TEXT NOT NULL,
  user_id UUID,
  guest_name TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz attempts"
  ON public.quiz_attempts FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view own attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view attempts by share_code"
  ON public.quiz_attempts FOR SELECT TO anon, authenticated
  USING (true);

-- ========================
-- 3. REFERRALS TABLE
-- ========================
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','paid','fraud')),
  reward_tier INTEGER DEFAULT 0,
  airtime_amount INTEGER DEFAULT 0,
  airtime_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (true);

-- ========================
-- 4. REFERRAL CODES TABLE
-- ========================
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_airtime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========================
-- 5. AIRTIME PAYOUTS TABLE
-- ========================
CREATE TABLE public.airtime_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  network TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.airtime_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts"
  ON public.airtime_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ========================
-- 6. QUESTION CACHE TABLE
-- ========================
CREATE TABLE public.question_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL UNIQUE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  generation_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.question_cache ENABLE ROW LEVEL SECURITY;
-- No client RLS policies — service_role only

-- ========================
-- 7. ALTER TESTS TABLE
-- ========================
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_resource_id UUID;

-- ========================
-- 8. ALTER CREDITS_WALLET TABLE
-- ========================
ALTER TABLE public.credits_wallet
  ADD COLUMN IF NOT EXISTS reward_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_expires_at TIMESTAMPTZ;

-- ========================
-- 9. GENERATE SHARE CODE FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', floor(random() * 54 + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.tests WHERE share_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ========================
-- 10. CREATE REFERRAL CODE FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION public.create_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_existing TEXT;
BEGIN
  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 30 + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$$;

-- ========================
-- 11. ADD REWARD CREDITS FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION public.add_reward_credits(p_user_id UUID, p_credits INTEGER, p_type TEXT DEFAULT 'bonus')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_sunday TIMESTAMPTZ;
BEGIN
  -- Add to reward_balance
  INSERT INTO public.credits_wallet (user_id, balance, reward_balance)
  VALUES (p_user_id, 0, p_credits)
  ON CONFLICT (user_id)
  DO UPDATE SET
    reward_balance = credits_wallet.reward_balance + p_credits,
    balance = credits_wallet.balance + p_credits,
    updated_at = now();

  -- Set expiry to coming Sunday 23:59:59 UTC (skip for referral rewards)
  IF p_type != 'referral' THEN
    v_next_sunday := date_trunc('week', now() + interval '7 days') - interval '1 second';
    UPDATE public.credits_wallet
    SET reward_expires_at = CASE
      WHEN reward_expires_at IS NULL OR reward_expires_at < now() THEN v_next_sunday
      ELSE reward_expires_at
    END
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_credits, p_type, 'Reward credits');
END;
$$;

-- ========================
-- 12. QUALIFY REFERRAL FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION public.qualify_referral(p_referred_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
  v_referrer_count INTEGER;
  v_airtime INTEGER;
BEGIN
  SELECT * INTO v_ref FROM public.referrals WHERE referred_id = p_referred_id AND status = 'pending';
  IF v_ref IS NULL THEN RETURN; END IF;

  -- Fraud: self-referral
  IF v_ref.referrer_id = p_referred_id THEN
    UPDATE public.referrals SET status = 'fraud' WHERE id = v_ref.id;
    RETURN;
  END IF;

  -- Get referrer's total count
  SELECT total_referrals INTO v_referrer_count FROM public.referral_codes WHERE user_id = v_ref.referrer_id;
  v_referrer_count := COALESCE(v_referrer_count, 0) + 1;

  -- Tiered airtime
  IF v_referrer_count >= 10 THEN v_airtime := 200;
  ELSIF v_referrer_count >= 5 THEN v_airtime := 100;
  ELSE v_airtime := 50;
  END IF;

  UPDATE public.referrals
  SET status = 'qualified', reward_tier = v_referrer_count, airtime_amount = v_airtime
  WHERE id = v_ref.id;

  UPDATE public.referral_codes
  SET total_referrals = v_referrer_count, total_airtime_earned = total_airtime_earned + v_airtime
  WHERE user_id = v_ref.referrer_id;

  -- Reward referrer with 10 credits (never expire)
  PERFORM public.add_reward_credits(v_ref.referrer_id, 10, 'referral');

  -- Log airtime payout placeholder
  INSERT INTO public.airtime_payouts (user_id, phone, amount, network, status)
  VALUES (v_ref.referrer_id, '', v_airtime, '', 'pending');
END;
$$;

-- ========================
-- 13. STORAGE BUCKET
-- ========================
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

CREATE POLICY "Anyone can view resources"
  ON storage.objects FOR SELECT USING (bucket_id = 'resources');

CREATE POLICY "Authenticated users can upload resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================
-- 14. ENABLE EXTENSIONS FOR CRON
-- ========================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ========================
-- 15. PUBLIC QUIZ: allow anon to read public tests and their questions
-- ========================
CREATE POLICY "Anyone can view public tests"
  ON public.tests FOR SELECT TO anon
  USING (is_public = true);

CREATE POLICY "Anyone can view questions of public tests"
  ON public.questions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = questions.test_id AND t.is_public = true));

CREATE POLICY "Authenticated can view questions of own or public tests"
  ON public.questions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = questions.test_id AND (t.user_id = auth.uid() OR t.is_public = true))
  );
