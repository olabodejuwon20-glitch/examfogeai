

# Improvements Plan

## 1. Fix Leaderboard Visibility (Critical)
**Problem**: RLS on `test_results` only allows users to see their own results, so the leaderboard only shows the current user.

**Fix**: Add a new RLS SELECT policy on `test_results` allowing all authenticated users to read all rows (for leaderboard aggregation). The existing policy is restrictive — we add a permissive one:

```sql
CREATE POLICY "All authenticated users can view results for leaderboard"
ON public.test_results FOR SELECT TO authenticated
USING (true);
```

## 2. Faster AI Generation
- **Parallel batch generation**: For 20+ questions, split into 2 parallel AI calls and merge results
- **Optimistic navigation**: Navigate to test page immediately with a "preparing" state, poll for readiness instead of blocking on CreateTest page
- **Trim prompt**: Remove redundant instructions, keep the prompt lean for faster token generation

## 3. Monetization via Stripe
- Enable the Stripe integration
- Create a free tier (3 tests/month) and a Pro plan (unlimited)
- Add a `user_usage` tracking table to count monthly test generations
- Gate test creation behind the usage limit, show upgrade prompts
- Add a settings/billing page

## Implementation Order
1. Fix `test_results` RLS policy (database migration)
2. Optimize AI generation edge function (parallel batching + leaner prompt)
3. Update CreateTest for optimistic navigation
4. Enable Stripe and implement subscription billing

## Technical Details
- The RLS fix is a single migration adding a permissive SELECT policy
- Parallel generation splits `numQuestions` into chunks of 10, fires concurrent fetch calls, then merges and inserts all at once
- Stripe integration uses Lovable's built-in Stripe tooling — no custom webhook setup needed

