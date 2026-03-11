import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap, ArrowLeft, Zap, Star, Crown, CheckCircle, Clock, History } from 'lucide-react';
import { toast } from 'sonner';

interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  perCredit: string;
  popular: boolean;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1.99,
    credits: 20,
    perCredit: '$0.10',
    popular: false,
    icon: <Zap className="h-5 w-5" />,
    color: 'border-border',
    features: [
      '20 AI question generations',
      'Up to 50 questions each',
      'PDF & JSON export',
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
    icon: <Star className="h-5 w-5" />,
    color: 'border-primary',
    features: [
      '75 AI question generations',
      'Up to 100 questions each',
      'All export formats',
      'Priority AI processing',
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
    icon: <Crown className="h-5 w-5" />,
    color: 'border-amber-500/50',
    features: [
      '200 AI question generations',
      'Unlimited questions each',
      'All export formats',
      'Priority AI processing',
      '30 days ad-free ✨',
      'Team sharing',
      'Credits never expire',
    ],
  },
];

export default function BuyCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'history'>('buy');

  useEffect(() => {
    loadWallet();
    loadTransactions();

    // Realtime balance subscription
    const channel = supabase
      .channel('credits-wallet-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits_wallet',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload: any) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const loadWallet = async () => {
    const { data } = await supabase
      .from('credits_wallet')
      .select('balance')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setBalance(data.balance);
    } else {
      // Wallet is created server-side by handle_new_user trigger
      setBalance(0);
    }
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

  const handleBuyCredits = async (pack: CreditPack) => {
    // TODO: Replace with real Flutterwave/Stripe payment
    // For now shows a coming soon message
    toast.info(`Payment gateway coming soon! Pack: ${pack.name} — ${pack.credits} credits for $${pack.price}`);

    // ---- FLUTTERWAVE INTEGRATION (uncomment when ready) ----
    // const handler = window.FlutterwaveCheckout({
    //   public_key: 'YOUR_FLUTTERWAVE_PUBLIC_KEY',
    //   tx_ref: `credits-${Date.now()}`,
    //   amount: pack.price,
    //   currency: 'USD',
    //   customer: { email: user!.email },
    //   meta: { user_id: user!.id, credits: pack.credits, pack: pack.id },
    //   callback: async (response) => {
    //     if (response.status === 'successful') {
    //       await supabase.rpc('add_credits', { p_user_id: user!.id, p_credits: pack.credits });
    //       await supabase.from('credit_transactions').insert({
    //         user_id: user!.id,
    //         amount: pack.credits,
    //         type: 'purchase',
    //         description: `Bought ${pack.name} pack`,
    //         payment_ref: response.transaction_id,
    //       });
    //       toast.success(`🎉 ${pack.credits} credits added!`);
    //       loadWallet();
    //       loadTransactions();
    //     }
    //   },
    //   onclose: () => {},
    // });
  };

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

  const getTypeColor = (type: string) => {
    if (type === 'usage') return 'text-destructive';
    return 'text-emerald-500';
  };

  const getAmountPrefix = (type: string) => {
    return type === 'usage' ? '-' : '+';
  };

  const getBalanceColor = () => {
    if (balance === null) return 'text-foreground';
    if (balance === 0) return 'text-destructive';
    if (balance <= 2) return 'text-amber-500';
    return 'text-emerald-500';
  };

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

      <main className="container mx-auto px-4 py-8 max-w-3xl">

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
              ? '😅 No credits left — buy a pack or watch an ad below'
              : balance === 1
              ? '⚠️ Almost out! 1 credit remaining'
              : `✅ Each generation uses 1 credit`}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`
                    p-6 flex flex-col relative overflow-hidden border-2 transition-all duration-200
                    hover:shadow-lg hover:-translate-y-1
                    ${pack.popular ? 'border-primary shadow-md shadow-primary/10' : pack.color}
                  `}
                >
                  {/* Popular badge */}
                  {pack.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                      POPULAR
                    </div>
                  )}

                  {/* Pack header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${pack.popular ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                      {pack.icon}
                    </div>
                    <span className="font-bold text-foreground">{pack.name}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <span className="text-3xl font-extrabold text-foreground">${pack.price}</span>
                  </div>
                  <p className="text-sm text-primary font-semibold mb-1">{pack.credits} credits</p>
                  <p className="text-xs text-muted-foreground mb-4">{pack.perCredit} per credit</p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {pack.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleBuyCredits(pack)}
                    className={`w-full ${pack.popular ? '' : 'variant-outline'}`}
                    variant={pack.popular ? 'default' : 'outline'}
                  >
                    Buy {pack.credits} Credits
                  </Button>
                </Card>
              ))}
            </div>

            {/* Watch ad option */}
            <Card className="p-5 border-dashed border-2 text-center">
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

            <p className="text-xs text-muted-foreground text-center mt-4">
              💡 Credits never expire once purchased. Secure payment powered by Flutterwave.
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
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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
