

# Plan: Resource Bank, Quiz Sharing, Referrals, Reward Expiry, Caching & Auth Persistence

This is a large feature batch covering 8 major areas. Here is the full implementation plan.

---

## Phase 1: Database Migration

One migration covering all new tables, columns, functions, and policies.

### New Tables

| Table | Purpose |
|-------|---------|
| `resource_bank` | Community-shared educational resources |
| `quiz_attempts` | Logs every public quiz attempt (guest or user) |
| `referrals` | Tracks referrer → referred relationships |
| `referral_codes` | Each user's unique referral code |
| `airtime_payouts` | Placeholder logging for airtime rewards |
| `question_cache` | Stores generated questions by content hash |

### Column Additions
- **tests**: `is_public` (bool, default false), `share_code` (text, unique), `content_hash` (text), `source_resource_id` (uuid nullable)
- **credits_wallet**: `reward_balance` (int, default 0), `reward_expires_at` (timestamp nullable)

### New SQL Functions
- `generate_share_code()` — random unique 8-char alphanumeric
- `create_referral_code(p_user_id)` — creates unique referral code
- `qualify_referral(p_referred_id)` — fraud-checked referral qualification with tiered airtime
- `add_reward_credits(p_user_id, p_credits, p_type)` — adds reward credits, sets Sunday expiry (skips for referral type)

### RLS Policies
- resource_bank: all authenticated can SELECT, owner can INSERT/DELETE
- quiz_attempts: anon+auth can INSERT, own SELECT
- referrals/referral_codes: owner SELECT only
- question_cache: no client access (service_role only via functions)

### Storage
- Create `resources` bucket for uploaded files

---

## Phase 2: Edge Functions

### `validate-image/index.ts` (new)
- Accepts base64 image, calls Lovable AI (gemini-2.5-flash) to check readability
- Returns `{valid, reason, word_count_estimate}`

### `categorise-resource/index.ts` (new)
- Accepts text content, calls Lovable AI for country/exam/subject/topic/summary
- Updates the resource_bank row with results

### `expire-rewards/index.ts` (new)
- Target for pg_cron Sunday job
- Zeroes expired reward_balance, logs transactions

### Update `generate-questions/index.ts`
- After generating, save questions to question_cache with content_hash
- Increment resource_bank.test_gen_count if source_resource_id is set

---

## Phase 3: Resource Bank Page (`src/pages/ResourceBank.tsx`)

- Header "Resource Bank" with upload button
- Two tabs: **Browse** (search bar + country/exam/subject filter pills, grid of resource cards) and **My Uploads** (user's own with delete button)
- Each card shows: subject badge, title, uploader name, test_gen_count, "Generate Test" button
- Generate Test navigates to /create-test with resource content pre-loaded
- Report button sets is_flagged=true

### Upload Bottom Sheet (3 options)
1. **Upload File** — accepts PDF, DOCX, TXT, JPG, PNG up to 20MB
2. **Take Photo** — `<input type="file" accept="image/*" capture="environment">`
3. **Paste Text** — textarea

### Image Validation
- Before upload, call `validate-image` edge function
- If invalid: error toast with reason, block upload
- If valid: proceed

### Post-Upload
- Upload file to `resources` storage bucket
- Call `categorise-resource` edge function
- Call `add_reward_credits(user_id, 3)` and show "+3 reward credits" toast

---

## Phase 4: Quiz Sharing

### Update `CreateTest.tsx`
- Add "Make this quiz shareable" toggle with link icon below Generate button
- When enabled: set is_public=true, call generate_share_code() on test insert

### Update `ResultsPage.tsx`
- Add "Share Quiz" button in action buttons
- If not public: confirmation dialog to make public
- Show share URL: `examforge.app/quiz/[share_code]`
- Copy Link + WhatsApp share buttons
- Quiz attempt counter

### New `src/pages/PublicQuiz.tsx` at `/quiz/:code`
- **Public route** — no auth required
- Fetch test by share_code; show "Quiz not found" if missing/not public
- Preview card: title, subject, questions count, time limit, creator name
- Full quiz-taking flow for guests (answers in component state)
- Submit calls quiz_attempts INSERT (anon RLS)
- Results screen with WAEC grade + signup CTA banner

### Update Dashboard
- "My Shared Quizzes" section for tests with is_public=true
- Show share_code link and attempt count per quiz

---

## Phase 5: Referral System

### Update `AuthPage.tsx`
- Check URL for `?ref=CODE`, store in localStorage as `pending_referral_code`
- After successful signup: look up referral code, insert pending referral row

### New `src/pages/Referral.tsx` at `/referral`
- User's referral link + large share button + WhatsApp button
- Reward tiers card (1-4 = ₦50, 5-9 = ₦100, 10+ = ₦200)
- Stats: total referrals, total airtime earned
- List of referrals with status badges (Pending/Qualified/Paid)
- Airtime message: "Sent within 24 hours to your registered phone"
- TODO comment for VTpass/Reloadly API integration

### Navigation
- Add "Invite Friends" to MobileNav and Dashboard quick actions
- Badge showing pending airtime amount if > 0

---

## Phase 6: Reward Credit Expiry

### Cron Job
- Enable pg_cron + pg_net extensions
- Schedule `expire-rewards` edge function every Sunday 23:59 UTC
- Zeroes expired reward_balance, inserts 'expired' transactions

### Dashboard Updates
- Amber banner if reward_expires_at within 3 days: "Your [N] reward credits expire in [X] days"
- Red banner if expiring today
- "Use Now" button → /create-test

### BuyCredits Update
- Show "Expires Sunday" / "Expires in X days" below reward balance

### Credits Display
- Amber color for reward credits expiring within 3 days
- "Why do rewards expire?" info tooltip

---

## Phase 7: Question Caching

### New `src/lib/contentHash.ts`
- djb2 hash function
- Content normalisation: trim, lowercase, remove punctuation, collapse spaces

### Update `CreateTest.tsx`
- Before calling edge function: compute content_hash, query question_cache
- **Cache hit** (enough questions): Fisher-Yates shuffle, exclude user's previously seen questions, insert directly, mark test ready, no credit deduction, show "Questions ready instantly!" toast
- **Cache miss**: proceed normally; after generation, save to cache
- Resource bank items: always check cache first, increment test_gen_count, background expand if insufficient

### Similarity Detection
- Before upload in ResourceBank: query for similar titles by same user
- Dialog: "Use existing resource or upload new?"

---

## Phase 8: Auth Persistence Fix

### Update `src/hooks/useAuth.tsx`
- Set up onAuthStateChange BEFORE calling getSession()
- Loading = true initially, only set false after getSession() resolves
- Add storageKey: 'examforge-auth'

### Update `src/App.tsx`
- ProtectedRoute shows animated ExamForge logo spinner while loading
- Never redirect to /auth during loading phase

---

## Routing Changes (App.tsx)

| Route | Component | Auth |
|-------|-----------|------|
| `/resource-bank` | ResourceBank | Protected |
| `/referral` | Referral | Protected |
| `/quiz/:code` | PublicQuiz | **Public** |

## Navigation Changes (MobileNav)

Replace "Chat" tab (duplicate leaderboard link) with "Resources" → `/resource-bank`

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create |
| `supabase/functions/validate-image/index.ts` | Create |
| `supabase/functions/categorise-resource/index.ts` | Create |
| `supabase/functions/expire-rewards/index.ts` | Create |
| `supabase/functions/generate-questions/index.ts` | Edit |
| `src/pages/ResourceBank.tsx` | Create |
| `src/pages/PublicQuiz.tsx` | Create |
| `src/pages/Referral.tsx` | Create |
| `src/lib/contentHash.ts` | Create |
| `src/pages/CreateTest.tsx` | Edit |
| `src/pages/ResultsPage.tsx` | Edit |
| `src/pages/Dashboard.tsx` | Edit |
| `src/pages/BuyCredits.tsx` | Edit |
| `src/pages/AuthPage.tsx` | Edit |
| `src/hooks/useAuth.tsx` | Edit |
| `src/App.tsx` | Edit |
| `MobileNav.tsx` | Edit |

