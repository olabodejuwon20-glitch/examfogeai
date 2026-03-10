// src/hooks/useCredits.tsx
// Central hook for all credit operations

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreditWallet {
  balance: number;
  total_purchased: number;
  ads_free_until: string | null;
  last_daily_credit: string | null;
}

export function useCredits() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credits_wallet')
      .select('balance, total_purchased, ads_free_until, last_daily_credit')
      .eq('user_id', user.id)
      .single();
    if (data) setWallet(data as CreditWallet);
    setLoading(false);
  }, [user]);

  // Subscribe to real-time balance changes
  useEffect(() => {
    if (!user) return;
    fetchWallet();

    const channel = supabase
      .channel('credits_wallet_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits_wallet',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setWallet(payload.new as CreditWallet);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchWallet]);

  // Check and give daily free credits
  const checkDailyCredits = useCallback(async () => {
    if (!user || !wallet) return;

    const now = new Date();
    const lastCredit = wallet.last_daily_credit
      ? new Date(wallet.last_daily_credit)
      : null;

    const hoursSinceLast = lastCredit
      ? (now.getTime() - lastCredit.getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLast >= 24) {
      // Give 2 free daily credits
      await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_credits: 2,
      });

      // Update last_daily_credit timestamp
      await supabase
        .from('credits_wallet')
        .update({ last_daily_credit: now.toISOString() })
        .eq('user_id', user.id);

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: 2,
        type: 'daily_free',
        description: 'Daily free credits',
      });

      toast.success('🎁 Your 2 daily free credits have been added!');
      fetchWallet();
    }
  }, [user, wallet, fetchWallet]);

  // Deduct 1 credit before generation
  const deductCredit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      await supabase.rpc('deduct_credit', { p_user_id: user.id });

      // Log usage
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -1,
        type: 'usage',
        description: 'Generated a test',
      });

      fetchWallet();
      return true;
    } catch (err: any) {
      return false;
    }
  }, [user, fetchWallet]);

  // Add credits (after purchase or rewarded ad)
  const addCredits = useCallback(async (
    credits: number,
    type: 'purchase' | 'rewarded_ad' | 'bonus',
    description: string,
    paymentRef?: string
  ) => {
    if (!user) return;

    await supabase.rpc('add_credits', {
      p_user_id: user.id,
      p_credits: credits,
    });

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: credits,
      type,
      description,
      payment_ref: paymentRef || null,
    });

    // If purchase, give 30 days ad-free
    if (type === 'purchase') {
      const adFreeUntil = new Date();
      adFreeUntil.setDate(adFreeUntil.getDate() + 30);
      await supabase
        .from('credits_wallet')
        .update({
          ads_free_until: adFreeUntil.toISOString(),
          total_purchased: (wallet?.total_purchased || 0) + credits,
        })
        .eq('user_id', user.id);
    }

    fetchWallet();
  }, [user, wallet, fetchWallet]);

  // Check loyalty bonus every 10 generations
  const checkLoyaltyBonus = useCallback(async (totalGenerations: number) => {
    if (!user || totalGenerations === 0) return;
    if (totalGenerations % 10 !== 0) return;

    await addCredits(1, 'bonus', `Loyalty bonus — ${totalGenerations} tests generated`);
    toast.success(`🏆 You've generated ${totalGenerations} tests! Here's 1 bonus credit 🎁`);
  }, [user, addCredits]);

  // Check if user is ad-free (paid recently)
  const isAdFree = useCallback((): boolean => {
    if (!wallet?.ads_free_until) return false;
    return new Date() < new Date(wallet.ads_free_until);
  }, [wallet]);

  return {
    wallet,
    balance: wallet?.balance ?? 0,
    loading,
    fetchWallet,
    checkDailyCredits,
    deductCredit,
    addCredits,
    checkLoyaltyBonus,
    isAdFree,
  };
}
