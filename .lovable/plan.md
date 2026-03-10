

# Credits System & Monetization Plan

## Overview
Full credits-based monetization system: wallet, transactions, daily rewards, loyalty bonuses, credit gating on AI generation, out-of-credits modal, buy credits page with Flutterwave payments, ad-free rewards, navbar badge, and transaction history.

---

## Phase 1: Database (Migrations)

### Migration 1: Tables + Functions + Trigger

**`credits_wallet`** table:
- `id` uuid PK, `user_id` uuid unique (not FK to auth.users — follows project pattern), `balance` int default 5, `total_purchased` int default 0, `ads_free_until` timestamptz nullable, `last_daily_credit` timestamptz nullable, `created_at`/`updated_at` timestamptz defaults
- RLS: users can SELECT and UPDATE their own row only
- Enable realtime for CreditsBadge live updates

**`credit_transactions`** table:
- `id` uuid PK, `user_id` uuid, `amount` int, `type` text, `description` text, `payment_ref` text nullable, `created_at` timestamptz
- RLS: users can SELECT own rows, INSERT own rows

**Database functions:**
- `add_credits(p_user_id uuid, p_credits int)` — upserts wallet balance, updates `updated_at`
- `deduct_credit(p_user_id uuid)` — checks balance >= 1, subtracts 1, raises exception if insufficient

**Trigger:** Extend existing `handle_new_user()` function to also insert a `credits_wallet` row with balance 5 for new signups. (The trigger `on_auth_user_created` already exists — we just alter the function body.)

---

## Phase 2: Credits Logic (`src/lib/credits.ts`)

- **`checkDailyCredits(userId)`** — fetch `last_daily_credit`, if null or >24h ago: call `add_credits` RPC with 2, update `last_daily_credit`, log transaction, show toast
- **`checkLoyaltyBonus(userId, totalGenerations)`** — if divisible by 10: call `add_credits` with 1, log transaction, show celebration toast
- **`getCreditsBalance(userId)`** — fetch balance from `credits_wallet`
- **`deductCredit(userId)`** — call `deduct_credit` RPC

Call `checkDailyCredits` in `Dashboard.tsx` on mount (after auth).

---

## Phase 3: Credit Gating in CreateTest

Before generation in `handleGenerate()`:
1. Fetch balance from `credits_wallet`
2. If balance < 1 → show `OutOfCreditsModal` instead of generating
3. If balance >= 1 → call `deduct_credit` RPC, proceed with generation, then call `checkLoyaltyBonus`

---

## Phase 4: UI Components

### `OutOfCreditsModal` (`src/components/credits/OutOfCreditsModal.tsx`)
- Friendly dialog: "You're out of credits"
- Three options: Watch ad (rewarded ad), Buy credits (navigate to `/buy-credits`), Come back tomorrow note
- Dark theme, no red/warning colors

### `BuyCredits` page (`src/pages/BuyCredits.tsx`)
- Show current balance (realtime)
- 3 pack cards: Starter ($1.99/20), Value ($4.99/75 "Most Popular"), Power ($9.99/200)
- Each shows price, credits, cost/credit, buy button
- Ad-free banner: "Buying any pack removes ads for 30 days"
- "Watch Ad Instead" subtle option at bottom
- Wire buy buttons to Flutterwave inline payment (install `flutterwave-react-v3`)
- On success: call `add_credits`, update `total_purchased`, set `ads_free_until` +30 days, log transaction, toast

### `CreditsBadge` (`src/components/credits/CreditsBadge.tsx`)
- Small pill in navbar showing balance with lightning bolt icon
- Realtime subscription to `credits_wallet` changes
- Color: green (3+), yellow (1-2), red (0)
- Clickable → navigate to `/buy-credits`
- Add to Dashboard header

### `CreditsHistory` page (`src/pages/CreditsHistory.tsx`)
- List all transactions from `credit_transactions` ordered by date desc
- Colored icons: green for credits in, red for usage
- Summary at top: total earned, total used, current balance

---

## Phase 5: Ad-Free Logic

Update `src/lib/admob.ts` — before showing banner/interstitial, check `ads_free_until` from wallet. If in the future, skip ad.

Update `AdSenseAd.tsx` — accept an `adsFreeUntil` prop or check via a shared hook. Hide if ad-free period active.

---

## Phase 6: Routing

Add routes in `App.tsx`:
- `/buy-credits` → `BuyCredits`
- `/credits-history` → `CreditsHistory`

---

## New Files
- `src/lib/credits.ts`
- `src/components/credits/OutOfCreditsModal.tsx`
- `src/components/credits/CreditsBadge.tsx`
- `src/pages/BuyCredits.tsx`
- `src/pages/CreditsHistory.tsx`

## Modified Files
- `supabase/functions/generate-questions/index.ts` (no change needed — gating is client-side)
- `src/pages/CreateTest.tsx` (credit check before generation)
- `src/pages/Dashboard.tsx` (daily credits check, CreditsBadge in header)
- `src/lib/admob.ts` (ad-free check)
- `src/components/AdSenseAd.tsx` (ad-free check)
- `src/App.tsx` (new routes)
- Database migration for tables, functions, trigger update

## Dependencies to Install
- `flutterwave-react-v3` for payment integration

## Note on Flutterwave
Placeholder public key will be used. You will need to replace it with your real Flutterwave public key before going live.

