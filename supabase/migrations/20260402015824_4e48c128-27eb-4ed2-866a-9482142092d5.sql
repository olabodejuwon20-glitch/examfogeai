
-- Fix WARN: tighten referrals INSERT policy
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals as referred"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id AND referrer_id != referred_id);

-- quiz_attempts INSERT is intentionally open (guests can submit)
-- question_cache has no policies intentionally (service_role only)
-- airtime_payouts has no INSERT policy intentionally (service_role only via qualify_referral)
