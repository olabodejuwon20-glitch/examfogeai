
# Plan: Resource Bank, Quiz Sharing, Referrals, Reward Expiry, Caching & Auth Persistence

This is a large request covering 6 major feature areas. Implementation will be done in phases.

---

## Phase 1: Database Migrations

A single large migration covering all new tables and schema changes:

### New Tables
1. **resource_bank** — id, user_id, title, description, file_url, file_type, country, exam, subject, topic, ai_category, ai_summary, upload_count, test_gen_count, is_flagged, created_at. RLS: authenticated SELECT all, owner DELETE only.
2. **quiz_attempts** — id, share_code, user_id (nullable), score, completed_at. RLS: INSERT for all (anon+auth), SELECT own.
3. **referrals** — id, referrer_id, referred_id (unique), referral_code, status, reward_tier, airtime_amount, airtime_sent_at, created_at. RLS: owner SELECT.
4. **referral_codes** — id, user_id (unique), code (unique), total_referrals, total_airtime_earned. RLS: owner SELECT.
5. **airtime_payouts** — id, user_id, phone, amount, network, status, created_at (logging table).
6. **question_cache** — id, content_hash (unique), questions (jsonb), generation_count, created_at, last_used_at. RLS: service_role only.

### Schema Changes
- **tests**: add `is_public` (boolean default false), `share_code` (text unique), `content_hash` (text), `source_resource_id` (uuid nullable)
- **credits_wallet**: add `reward_balance` (integer default 0), `reward_expires_at` (timestamp nullable)

### SQL Functions
- `generate_share_code()` — random 8-char alphanumeric, unique in tests
- `create_referral_code(p_user_id)` — generates unique 8-char code
- `qualify_referral(p_referred_id)` — marks referral qualified, calculates airtime tier, adds 10 reward credits, includes fraud checks
- `add_reward_credits(p_user_id, p_credits)` — adds to reward_balance, sets reward_expires_at to next Sunday (skip for referral type)

### Storage
- Create `resources` storage bucket for uploaded files (public read, authenticated upload)

---

## Phase 2: Edge Functions

### 2a. `validate-image` edge function
- Receives base64 image
- Calls Lovable AI (gemini-2.5-flash) with the validation prompt
- Returns `{valid, reason, word_count_estimate}`

### 2b. `categorise-resource` edge function
- Receives file content text
- Calls Lovable AI with categorisation prompt
- Returns `{country, exam, subject, topic, summary}`
- Updates resource_bank row with AI results

### 2c. Update `generate-questions` edge function
- After generating, save questions to question_cache with content_hash
- Support source_resource_id to increment test_gen_count

---

## Phase 3: Resource Bank Page

### `src/pages/ResourceBank.tsx`
- Header with upload button
- Two tabs: "Browse" (search + filter pills for country/exam/subject, grid of cards) and "My Uploads" (user's own, with delete)
- Upload bottom sheet with 3 options: Upload File, Take Photo, Paste Text
- Image validation before upload (calls validate-image edge function)
- AI categorisation after upload (calls categorise-resource edge function)
- +3 reward credits after successful upload
- Report button (sets is_flagged=true)
- "Generate Test" button navigates to /create-test with resource pre-loaded

---

## Phase 4: Quiz Sharing

### Update `CreateTest.tsx`
- Add "Make this quiz shareable" toggle below Generate button
- When enabled, set is_public=true and call generate_share_code() on save

### Update `ResultsPage.tsx`
- Add "Share Quiz" button
- Dialog to make test public if not already
- Show share URL, Copy Link button, WhatsApp share button
- Show attempt counter from quiz_attempts

### New `src/pages/PublicQuiz.tsx` at `/quiz/:code`
- Public route (no auth required)
- Fetch test by share_code, show preview card
- Guest quiz-taking flow (answers in local state)
- Results with WAEC grade + signup CTA banner
- Log attempt to quiz_attempts table

### Update Dashboard
- "My Shared Quizzes" section showing public tests with share links and attempt counts

---

## Phase 5: Referral System

### Update `AuthPage.tsx`
- Check URL for `?ref=CODE`, store in localStorage
- After signup, look up code, insert pending referral row

### New `src/pages/Referral.tsx` at `/referral`
- Show user's unique referral link
- Share + WhatsApp buttons
- Reward tiers card (1-4=₦50, 5-9=₦100, 10+=₦200)
- Stats: total referrals, total airtime
- List of referrals with status badges
- Airtime payout note with VTpass TODO comment

### `airtime_payouts` table
- Placeholder function `send_airtime()` logs to table with TODO comment

### Update navigation
- Add "Invite Friends" to MobileNav and Dashboard quick actions
- Badge showing pending airtime if >0

---

## Phase 6: Reward Credit Expiry

### Cron job (scheduled edge function)
- Runs every Sunday 23:59 UTC
- Zeroes out expired reward_balance, logs transactions
- Uses pg_cron + pg_net

### Update Dashboard
- Amber/red expiry warning banners with "Use Now" button
- Check reward_expires_at on load

### Update BuyCredits
- Show "Expires Sunday" / "Expires in X days" below reward balance

### Update credits display everywhere
- Amber color for reward credits expiring within 3 days
- "Why do rewards expire?" tooltip

---

## Phase 7: Question Caching

### Client-side hashing
- Implement djb2 hash in JS with content normalisation (trim, lowercase, remove punctuation, collapse spaces)

### Cache lookup in CreateTest.tsx
- Before calling edge function: compute hash, query question_cache
- If cache hit with enough questions: shuffle (Fisher-Yates), exclude previously seen, insert directly, mark test ready, no credit deduction
- If cache miss: proceed normally, save to cache after generation

### Resource Bank cache integration
- Always check cache first for resource_bank items
- Increment test_gen_count on every use
- Background generation to expand cache if insufficient questions

### Similarity detection
- Query resource_bank for similar titles before upload
- Show dialog if duplicate detected

---

## Phase 8: Auth Persistence Fix

### Update `src/hooks/useAuth.tsx`
- Ensure onAuthStateChange is set up BEFORE getSession()
- Loading state only set to false after getSession() resolves
- storageKey set to 'examforge-auth'

### Update `src/App.tsx`
- ProtectedRoute shows animated loading spinner during auth check, never redirects while loading

### Note
- Supabase client already has `persistSession: true` and `storage: localStorage` configured in the auto-generated client file

---

## Routing Changes (App.tsx)

Add these routes:
- `/resource-bank` — ResourceBank (protected)
- `/referral` — Referral (protected)
- `/quiz/:code` — PublicQuiz (**public**, no ProtectedRoute)

## Navigation Changes (MobileNav)

Replace "Chat" tab with "Resources" → `/resource-bank`
Add "Invite" as a quick action on Dashboard

---

## Files Created/Modified

| File | Action |
|------|--------|
| Migration SQL | Create (all tables, functions, policies) |
| `supabase/functions/validate-image/index.ts` | Create |
| `supabase/functions/categorise-resource/index.ts` | Create |
| `supabase/functions/generate-questions/index.ts` | Edit (add caching) |
| `supabase/functions/expire-rewards/index.ts` | Create (cron target) |
| `src/pages/ResourceBank.tsx` | Create |
| `src/pages/PublicQuiz.tsx` | Create |
| `src/pages/Referral.tsx` | Create |
| `src/pages/CreateTest.tsx` | Edit (sharing toggle, caching, resource pre-load) |
| `src/pages/ResultsPage.tsx` | Edit (share button) |
| `src/pages/Dashboard.tsx` | Edit (shared quizzes, expiry banners, quick actions) |
| `src/pages/BuyCredits.tsx` | Edit (expiry display) |
| `src/pages/AuthPage.tsx` | Edit (referral code capture) |
| `src/hooks/useAuth.tsx` | Edit (auth persistence) |
| `src/App.tsx` | Edit (new routes, loading spinner) |
| `MobileNav.tsx` | Edit (new tabs) |
| `src/lib/contentHash.ts` | Create (djb2 hash + normalisation) |

## Security Considerations

- Resource uploads go through storage bucket with authenticated-only upload policy
- Image validation runs server-side via edge function before accepting uploads
- Referral fraud checks in SQL function (self-referral, timestamp validation)
- Question cache is service_role only — no client access
- Public quiz route uses anon access with INSERT-only policy on quiz_attempts
- add_reward_credits restricted to service_role like add_credits
