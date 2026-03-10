// src/pages/BuyCredits.tsx
// Credit purchase page with Flutterwave integration

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Zap, PlayCircle, Check, Star } from 'lucide-react';
import { toast } from 'sonner';
import { showRewardedAd } from '@/lib/admob';

// ⚠️ Replace with your real Flutterwave public key
const FLW_PUBLIC_KEY = 'FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXX-X';

interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  perCredit: string;
  popular: boolean;
  features: string[];
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1.99,
    credits: 20,
    perCredit: '$0.10',
    popular: false,
    features: [
      '20 test generations',
      'Up to 50 questions each',
      'PDF export',
      'Credits never expire',
    ],
  },
  {
    id: 'value',
    name: 'Value',
    price: 4.99,
    credits: 75,
    perCredit: '$0.07',
    popular: true,
    features: [
      '75 test generations',
      'Up to 50 questions each',
      'PDF export',
      '30 days ad-free ✨',
      'Credits never expire',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    price: 9.99,
    credits: 200,
    perCredit: '$0.05',
    popular: false,
    features: [
      '200 test generations',
      'Up to 50 questions each',
      'PDF export',
      '30 days ad-free ✨',
      'Priority processing',
      'Credits never expire',
    ],
  },
];

export default function BuyCredits() {
  const { user } = useAuth();
  const { balance, addCredits } = useCredits();
  const [processingPack, setProcessingPack] = useState<string | null>(null);

  const handlePurchase = async (pack: CreditPack) => {
    if (!user) return;
    setProcessingPack(pack.id);

    try {
      // Dynamically load Flutterwave
      const FlutterwaveCheckout = (window as any).FlutterwaveCheckout;

      if (!FlutterwaveCheckout) {
        // Load Flutterwave script dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.flutterwave.com/v3.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Flutterwave'));
          document.head.appendChild(script);
        });
      }

      (window as any).FlutterwaveCheckout({
        public_key: FLW_PUBLIC_KEY,
        tx_ref: `qp-${user.id}-${Date.now()}`,
        amount: pack.price,
        currency: 'USD',
        payment_options: 'card, mobilemoneyghana, ussd',
        customer: {
          email: user.email,
          name: user.email?.split('@')[0] || 'User',
        },
        customizations: {
          title: 'ExamForge AI Credits',
          description: `${pack.name} Pack — ${pack.credits} credits`,
          logo: 'https://examfogeai.lovable.app/pwa-192x192.png',
        },
        meta: {
          user_id: user.id,
          credits: pack.credits,
          pack_name: pack.name,
        },
        callback: async (response: any) => {
          if (response.status === 'successful') {
            await addCredits(
              pack.credits,
              'purchase',
              `Bought ${pack.name} pack — ${pack.credits} credits`,
              response.transaction_id?.toString()
            );
            toast.success(`🎉 ${pack.credits} credits added! Enjoy 30 days ad-free ✨`);
          } else {
            toast.error('Payment was not completed.');
          }
          setProcessingPack(null);
        },
        onclose: () => {
          setProcessingPack(null);
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Payment failed. Please try again.');
      setProcessingPack(null);
    }
  };

  const handleWatchAd = async () => {
    if (!user) return;
    try {
      const rewarded = await showRewardedAd(user.id);
      if (rewarded) {
        await addCredits(1, 'rewarded_ad', 'Earned from watching video ad');
        toast.success('🎉 You earned 1 free credit!');
      } else {
        toast.error('Ad not available right now. Try again later.');
      }
    } catch {
      toast.error('Ad not available right now. Try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Buy Credits</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Current Balance */}
        <div className="text-center mb-10">
          <p className="text-sm text-muted-foreground mb-1">Your current balance</p>
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-4xl font-extrabold text-foreground">{balance}</span>
            <span className="text-lg text-muted-foreground">credits</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            1 credit = 1 AI test generation
          </p>
        </div>

        {/* Free Option */}
        <button
          onClick={handleWatchAd}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all mb-8 text-left"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Watch a 30s video → Earn 1 free credit</p>
            <p className="text-sm text-muted-foreground">No payment needed. Watch an ad and generate instantly.</p>
          </div>
          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            FREE
          </span>
        </button>

        {/* Ad-free banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted mb-8 text-sm">
          <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <p className="text-foreground">
            <span className="font-semibold">Buying any pack removes all ads for 30 days</span>
            <span className="text-muted-foreground"> — enjoy a clean, distraction-free experience.</span>
          </p>
        </div>

        {/* Credit Packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={`p-6 relative flex flex-col ${
                pack.popular
                  ? 'border-primary shadow-lg shadow-primary/10'
                  : 'border-border'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  {pack.name}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-foreground">${pack.price}</span>
                </div>
                <p className="text-sm text-primary font-semibold">
                  {pack.credits} credits
                </p>
                <p className="text-xs text-muted-foreground">
                  {pack.perCredit} per credit
                </p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {pack.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${pack.popular ? '' : 'variant-outline'}`}
                variant={pack.popular ? 'default' : 'outline'}
                onClick={() => handlePurchase(pack)}
                disabled={processingPack === pack.id}
              >
                {processingPack === pack.id ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Buy ${pack.credits} Credits`
                )}
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3 text-sm text-muted-foreground text-center pb-8">
          <p>✦ Credits never expire once purchased</p>
          <p>✦ Secure payment via Flutterwave</p>
          <p>✦ Supports cards, bank transfer & mobile money</p>
          <p>✦ All purchases remove banner ads for 30 days</p>
        </div>
      </main>
    </div>
  );
}
