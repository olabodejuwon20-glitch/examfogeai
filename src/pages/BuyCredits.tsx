import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap, ArrowLeft, Zap, Star, Crown, Gem,
  CheckCircle, Clock, History, Shield, Lock, Rocket,
  PartyPopper, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Flutterwave types ──────────────────────────────── */
declare global {
  interface Window {
    FlutterwaveCheckout: (config: Record<string, unknown>) => { close: () => void };
  }
}

/* ─── Currency helpers ───────────────────────────────── */
const RATE_TABLE: Record<string, { symbol: string; rate: number }> = {
  NGN: { symbol: '₦', rate: 1 },
  GHS: { symbol: 'GH₵', rate: 0.008 },
  KES: { symbol: 'KSh', rate: 0.09 },
  ZAR: { symbol: 'R', rate: 0.012 },
  UGX: { symbol: 'USh', rate: 2.5 },
  TZS: { symbol: 'TSh', rate: 1.7 },
};

const BASE_PRICE_PER_CREDIT = 35; // NGN

function detectCurrency(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Africa/Lagos') || tz.startsWith('Africa/Abuja')) return 'NGN';
    if (tz.startsWith('Africa/Accra')) return 'GHS';
    if (tz.startsWith('Africa/Nairobi')) return 'KES';
    if (tz.startsWith('Africa/Johannesburg') || tz.startsWith('Africa/Cape_Town')) return 'ZAR';
    if (tz.startsWith('Africa/Kampala')) return 'UGX';
    if (tz.startsWith('Africa/Dar_es_Salaam')) return 'TZS';
  } catch { /* fallback */ }
  return 'NGN';
}

function convertPrice(ngnAmount: number, currency: string): number {
  const info = RATE_TABLE[currency] || RATE_TABLE.NGN;
  return Math.ceil(ngnAmount * info.rate);
}

function formatPrice(amount: number, currency: string): string {
  const info = RATE_TABLE[currency] || RATE_TABLE.NGN;
  return `${info.symbol}${amount.toLocaleString()}`;
}

/* ─── Packages ───────────────────────────────────────── */
interface CreditPack {
  id: string;
  name: string;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  popular: boolean;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

const PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    baseCredits: 10,
    bonusCredits: 0,
    totalCredits: 10,
    popular: false,
    icon: <Zap className="h-5 w-5" />,
    color: 'border-border',
    features: [
      '10 AI test generations',
      'Unlocks Community Hub',
      'PDF & JSON export',
      'Credits never expire',
    ],
  },
  {
    id: 'value',
    name: 'Value',
    baseCredits: 30,
    bonusCredits: 5,
    totalCredits: 35,
    popular: true,
    icon: <Star className="h-5 w-5" />,
    color: 'border-primary',
    features: [
      '30 + 5 bonus credits',
      'Unlocks Community Hub',
      'All export formats',
      '30 days ad-free ✨',
      'Credits never expire',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    baseCredits: 60,
    bonusCredits: 15,
    totalCredits: 75,
    popular: false,
    icon: <Crown className="h-5 w-5" />,
    color: 'border-amber-500/50',
    features: [
      '60 + 15 bonus credits',
      'Unlocks Community Hub',
      'All export formats',
      '30 days ad-free ✨',
      'Priority AI processing',
      'Credits never expire',
    ],
  },
  {
    id: 'mega',
    name: 'Mega',
    baseCredits: 100,
    bonusCredits: 30,
    totalCredits: 130,
    popular: false,
    icon: <Gem className="h-5 w-5" />,
    color: 'border-purple-500/50',
    features: [
      '100 + 30 bonus credits',
      'Unlocks Community Hub',
      'All export formats',
      '30 days ad-free ✨',
      'Priority AI processing',
      'Team sharing',
      'Credits never expire',
    ],
  },
];

/* ─── Flutterwave script loader ──────────────────────── */
function loadFlutterwave(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Flutterwave'));
    document.head.appendChild(script);
  });
}

/* ─── Transaction helpers ────────────────────────────── */
interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const FLW_PUBLIC_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY || '';
const IS_TEST_MODE = FLW_PUBLIC_KEY.includes('_TEST-');

/* ─── Component ──────────────────────────────────────── */
export default function BuyCredits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'history'>('buy');
  const [payingPack, setPayingPack] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ credits: number; hubUnlocked: boolean } | null>(null);
  const currency = useRef(detectCurrency());

  useEffect(() => {
    loadWallet();
    loadTransactions();

    const channel = supabase
      .channel('credits-wallet-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'credits_wallet',
        filter: `user_id=eq.${user?.id}`,
      }, (payload: any) => {
        if (payload.new?.balance !== undefined) setBalance(payload.new.balance);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const loadWallet = async () => {
    const { data } = await supabase
      .from('credits_wallet')
      .select('balance')
      .eq('user_id', user!.id)
      .single();
    setBalance(data?.balance ?? 0);
    setLoadingBalance(false);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setTransactions(data);
  };

  const refreshCredits = useCallback(() => {
    loadWallet();
    loadTransactions();
  }, [user?.id]);

  /* ─── Payment flow ─────────────────────────────────── */
  const handleBuyCredits = async (pack: CreditPack) => {
    if (!FLW_PUBLIC_KEY) {
      toast.error('Payment not configured. Please contact support.');
      return;
    }

    setPayingPack(pack.id);

    try {
      await loadFlutterwave();

      const cur = currency.current;
      const amount = convertPrice(pack.baseCredits * BASE_PRICE_PER_CREDIT, cur);
      const txRef = `examforge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Insert pending row
      const { error: insertErr } = await supabase.from('payment_transactions').insert({
        user_id: user!.id,
        tx_ref: txRef,
        amount,
        currency: cur,
        credits: pack.totalCredits,
        package_name: pack.name,
        status: 'pending',
        customer_email: user!.email || '',
        customer_name: user!.user_metadata?.display_name || '',
      });

      if (insertErr) throw insertErr;

      window.FlutterwaveCheckout({
        public_key: FLW_PUBLIC_KEY,
        tx_ref: txRef,
        amount,
        currency: cur,
        customer: {
          email: user!.email || '',
          name: user!.user_metadata?.display_name || '',
          phone_number: '',
        },
        customizations: {
          title: 'ExamForge Credits',
          description: `${pack.totalCredits} credits — ${pack.name} Package`,
          logo: 'https://examfogeai.lovable.app/pwa-192x192.png',
        },
        meta: {
          user_id: user!.id,
          credits: pack.totalCredits,
          package: pack.id,
        },
        payment_options: 'card,banktransfer,ussd,mobilemoney,googlepay,applepay',
        callback: (response: any) => {
          if (response.status === 'successful' || response.status === 'completed') {
            setSuccessInfo({
              credits: pack.totalCredits,
              hubUnlocked: pack.totalCredits >= 10,
            });
            refreshCredits();
          } else {
            toast.error('Payment was not successful. Please try again.');
          }
          setPayingPack(null);
        },
        onclose: () => {
          setPayingPack(null);
        },
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error('Could not start payment. Please try again.');
      setPayingPack(null);
    }
  };

  /* ─── Helpers ──────────────────────────────────────── */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '💳';
      case 'usage': return '⚡';
      case 'rewarded_ad': return '📺';
      case 'daily_free': return '🎁';
      case 'bonus': return '🏆';
      default: return '✦';
    }
  };

  const getTypeColor = (type: string) =>
    type === 'usage' ? 'text-destructive' : 'text-emerald-500';

  const getAmountPrefix = (type: string) =>
    type === 'usage' ? '-' : '+';

  const getBalanceColor = () => {
    if (balance === null) return 'text-foreground';
    if (balance === 0) return 'text-destructive';
    if (balance <= 2) return 'text-amber-500';
    return 'text-emerald-500';
  };

  /* ─── Success screen ───────────────────────────────── */
  if (successInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground">
              <span className="text-emerald-500 font-bold text-lg">{successInfo.credits}</span> credits have been added to your account.
            </p>
          </div>
          {successInfo.hubUnlocked && (
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm">
              🎉 Community Hub Unlocked!
            </Badge>
          )}
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => navigate('/create-test')} className="w-full">
              <Rocket className="h-4 w-4 mr-2" /> Generate Test
            </Button>
            {successInfo.hubUnlocked && (
              <Button variant="outline" onClick={() => navigate('/community')} className="w-full">
                Community Hub <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSuccessInfo(null)} className="w-full text-muted-foreground">
              Back to Credits
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── Main render ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Credits</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Test mode banner */}
        {IS_TEST_MODE && (
          <Card className="p-4 mb-6 border-amber-500/40 bg-amber-500/5">
            <p className="text-sm font-semibold text-amber-600 mb-1">
              🧪 Test Mode — No real money charged
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Card: 5531 8866 5214 2950 · CVV: 564 · Expiry: 09/32 · PIN: 3310
            </p>
          </Card>
        )}

        {/* Balance Card */}
        <Card className="p-6 mb-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-sm text-muted-foreground mb-1 font-medium uppercase tracking-wider">
            Your Credit Balance
          </p>
          {loadingBalance ? (
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto my-2" />
          ) : (
            <p className={`text-6xl font-extrabold ${getBalanceColor()} mb-2`}>
              {balance ?? 0}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {balance === 0
              ? '😅 No credits left — buy a pack below'
              : balance === 1
              ? '⚠️ Almost out! 1 credit remaining'
              : '✅ Each generation uses 1 credit'}
          </p>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('buy')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'buy'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Buy Credits
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'buy' && (
          <>
            {/* Free daily reminder */}
            <Card className="p-4 mb-6 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground text-sm">🎁 Free Daily Credits</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Come back every 24 hours to get 2 free credits automatically
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Auto-added daily
              </span>
            </Card>

            {/* Credit packs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {PACKS.map((pack) => {
                const price = convertPrice(pack.baseCredits * BASE_PRICE_PER_CREDIT, currency.current);
                const perCredit = formatPrice(
                  Math.ceil(price / pack.totalCredits),
                  currency.current
                );
                const isPaying = payingPack === pack.id;

                return (
                  <Card
                    key={pack.id}
                    className={`
                      p-5 flex flex-col relative overflow-hidden border-2 transition-all duration-200
                      hover:shadow-lg hover:-translate-y-1
                      ${pack.popular ? 'border-primary shadow-md shadow-primary/10' : pack.color}
                    `}
                  >
                    {pack.popular && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-lg ${pack.popular ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                        {pack.icon}
                      </div>
                      <span className="font-bold text-foreground text-sm">{pack.name}</span>
                    </div>

                    <div className="mb-1">
                      <span className="text-2xl font-extrabold text-foreground">
                        {formatPrice(price, currency.current)}
                      </span>
                    </div>
                    <p className="text-sm text-primary font-semibold mb-0.5">
                      {pack.totalCredits} credits
                      {pack.bonusCredits > 0 && (
                        <span className="text-emerald-500 text-xs ml-1">+{pack.bonusCredits} bonus</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">{perCredit}/credit</p>

                    <ul className="space-y-1.5 mb-5 flex-1">
                      {pack.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleBuyCredits(pack)}
                      disabled={isPaying || !FLW_PUBLIC_KEY}
                      className="w-full"
                      variant={pack.popular ? 'default' : 'outline'}
                    >
                      {isPaying ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          Processing…
                        </span>
                      ) : (
                        `Buy ${pack.totalCredits} Credits`
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {/* Watch ad option */}
            <Card className="p-5 border-dashed border-2 text-center mb-8">
              <p className="text-sm font-semibold text-foreground mb-1">
                📺 No money? No problem!
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Watch a short 30-second video ad and earn 1 free credit instantly
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Rewarded ads available on the mobile app!')}
              >
                Watch Ad → Earn 1 Free Credit
              </Button>
            </Card>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                256-bit SSL encrypted
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Secured by Flutterwave
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Instant credit delivery
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              💡 Credits never expire once purchased. Payments are in {currency.current}.
            </p>
          </>
        )}

        {activeTab === 'history' && (
          <div>
            {transactions.length === 0 ? (
              <Card className="p-10 text-center">
                <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No transactions yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your credit history will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) => (
                  <Card key={t.id} className="p-4 flex items-center gap-4">
                    <div className="text-xl flex-shrink-0">{getTypeIcon(t.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.description || t.type}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${getTypeColor(t.type)}`}>
                      {getAmountPrefix(t.type)}{Math.abs(t.amount)} credit{Math.abs(t.amount) !== 1 ? 's' : ''}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
