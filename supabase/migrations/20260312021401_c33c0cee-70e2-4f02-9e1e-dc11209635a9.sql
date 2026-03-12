
-- 1. payment_transactions table
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tx_ref text UNIQUE NOT NULL,
  flw_ref text,
  flw_tx_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  credits integer NOT NULL,
  package_name text NOT NULL,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  grants_hub_access boolean DEFAULT false,
  customer_email text,
  customer_name text,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert pending payments" ON public.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 2. webhook_logs table
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'flutterwave',
  event_type text,
  payload jsonb,
  tx_ref text,
  status text DEFAULT 'received',
  error text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
-- No public access to webhook_logs

-- 3. grant_hub_access function
CREATE OR REPLACE FUNCTION public.grant_hub_access(p_user_id uuid, p_credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_credits >= 10 THEN
    UPDATE public.payment_transactions
    SET grants_hub_access = true, updated_at = now()
    WHERE user_id = p_user_id AND status = 'successful' AND grants_hub_access = false;
  END IF;
END;
$$;

-- Restrict grant_hub_access to service_role
REVOKE EXECUTE ON FUNCTION public.grant_hub_access(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_hub_access(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_hub_access(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_hub_access(uuid, integer) TO service_role;

-- 4. fulfil_payment function
CREATE OR REPLACE FUNCTION public.fulfil_payment(
  p_tx_ref text,
  p_flw_ref text,
  p_flw_tx_id text,
  p_amount numeric,
  p_currency text,
  p_status text,
  p_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx record;
BEGIN
  -- Get the pending transaction
  SELECT * INTO v_tx FROM public.payment_transactions WHERE tx_ref = p_tx_ref;
  
  IF v_tx IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_tx_ref;
  END IF;

  -- Already processed
  IF v_tx.status = 'successful' THEN
    RETURN jsonb_build_object('status', 'already_fulfilled', 'credits', v_tx.credits, 'user_id', v_tx.user_id);
  END IF;

  -- Update transaction
  UPDATE public.payment_transactions
  SET status = p_status,
      flw_ref = p_flw_ref,
      flw_tx_id = p_flw_tx_id,
      payment_method = p_method,
      updated_at = now()
  WHERE tx_ref = p_tx_ref;

  IF p_status = 'successful' THEN
    -- Add credits via existing function
    PERFORM public.add_credits(v_tx.user_id, v_tx.credits, 'purchase', 'Bought ' || v_tx.package_name || ' pack', p_tx_ref);

    -- Grant hub access if applicable
    IF v_tx.credits >= 10 THEN
      UPDATE public.payment_transactions
      SET grants_hub_access = true
      WHERE tx_ref = p_tx_ref;
    END IF;

    -- Grant 30 days ad-free
    UPDATE public.credits_wallet
    SET ads_free_until = now() + interval '30 days',
        total_purchased = total_purchased + v_tx.credits,
        updated_at = now()
    WHERE user_id = v_tx.user_id;
  END IF;

  RETURN jsonb_build_object('status', 'fulfilled', 'credits', v_tx.credits, 'user_id', v_tx.user_id);
END;
$$;

-- Restrict fulfil_payment to service_role
REVOKE EXECUTE ON FUNCTION public.fulfil_payment(text, text, text, numeric, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfil_payment(text, text, text, numeric, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfil_payment(text, text, text, numeric, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fulfil_payment(text, text, text, numeric, text, text, text) TO service_role;

-- 5. Updated_at trigger for payment_transactions
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
