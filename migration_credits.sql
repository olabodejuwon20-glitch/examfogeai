-- ============================================================
-- CREDIT SYSTEM MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Credits Wallet Table
CREATE TABLE public.credits_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 5,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  ads_free_until TIMESTAMPTZ DEFAULT NULL,
  last_daily_credit TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credits_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.credits_wallet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON public.credits_wallet FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_credits_wallet_updated_at
  BEFORE UPDATE ON public.credits_wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Credit Transactions Table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'rewarded_ad', 'daily_free', 'bonus', 'refund')),
  description TEXT,
  payment_ref TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 3. add_credits function
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_credits INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO public.credits_wallet (user_id, balance)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits_wallet.balance + p_credits,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. deduct_credit function
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF (SELECT balance FROM public.credits_wallet WHERE user_id = p_user_id) < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE public.credits_wallet
  SET balance = balance - 1,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. Update handle_new_user to also create wallet with 5 free credits
-- (Drop existing trigger first, then recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Create credit wallet with 5 free credits
  INSERT INTO public.credits_wallet (user_id, balance)
  VALUES (NEW.id, 5);

  -- Log the free credits transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 5, 'bonus', 'Welcome bonus — 5 free credits');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. Enable realtime on credits_wallet so balance updates instantly in UI
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits_wallet;
