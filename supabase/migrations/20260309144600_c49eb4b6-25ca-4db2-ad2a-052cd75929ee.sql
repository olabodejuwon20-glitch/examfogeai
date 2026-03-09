CREATE POLICY "All authenticated users can view results for leaderboard"
ON public.test_results FOR SELECT TO authenticated
USING (true);