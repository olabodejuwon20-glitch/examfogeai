-- Remove client INSERT policy on credits_wallet (wallet created by server-side trigger only)
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.credits_wallet;

-- Restrict UPDATE policy to only allow updating non-balance fields from client
DROP POLICY IF EXISTS "Users can update own wallet" ON public.credits_wallet;
CREATE POLICY "Users can update own wallet non-balance fields"
  ON public.credits_wallet FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND balance = (SELECT cw.balance FROM public.credits_wallet cw WHERE cw.user_id = auth.uid())
    AND total_purchased = (SELECT cw.total_purchased FROM public.credits_wallet cw WHERE cw.user_id = auth.uid())
  );

-- Remove client INSERT on credit_transactions - transactions logged by SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;

-- Update add_credits to also log the transaction server-side
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_credits integer, p_type text DEFAULT 'bonus', p_description text DEFAULT NULL, p_payment_ref text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO public.credits_wallet (user_id, balance)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = credits_wallet.balance + p_credits,
    updated_at = now();

  INSERT INTO public.credit_transactions (user_id, amount, type, description, payment_ref)
  VALUES (p_user_id, p_credits, p_type, p_description, p_payment_ref);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update deduct_credit to also log the transaction
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF (SELECT balance FROM public.credits_wallet WHERE user_id = p_user_id) < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE public.credits_wallet
  SET balance = balance - 1, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -1, 'usage', 'Generated a test');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;