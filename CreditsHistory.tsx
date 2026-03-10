// src/pages/CreditsHistory.tsx
// Shows all credit transactions for the user

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Zap, Plus, Minus, Gift, Tv, RotateCcw, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  payment_ref: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  purchase:    { icon: Zap,       color: 'text-primary',     label: 'Purchase' },
  usage:       { icon: Minus,     color: 'text-destructive', label: 'Used' },
  rewarded_ad: { icon: Tv,        color: 'text-green-500',   label: 'Rewarded Ad' },
  daily_free:  { icon: RotateCcw, color: 'text-blue-500',    label: 'Daily Free' },
  bonus:       { icon: Gift,      color: 'text-yellow-500',  label: 'Bonus' },
  refund:      { icon: Star,      color: 'text-purple-500',  label: 'Refund' },
};

export default function CreditsHistory() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setTransactions(data as Transaction[]);
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  const totalEarned = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUsed = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/buy-credits">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Credits History</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-2xl font-extrabold text-primary">{balance}</p>
            <p className="text-xs text-muted-foreground mt-1">Balance</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-extrabold text-green-500">+{totalEarned}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-extrabold text-destructive">-{totalUsed}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Used</p>
          </Card>
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No transactions yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.bonus;
              const Icon = config.icon;
              const isPositive = tx.amount > 0;

              return (
                <Card key={tx.id} className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || config.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
