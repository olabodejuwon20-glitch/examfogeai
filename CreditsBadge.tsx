// src/components/credits/CreditsBadge.tsx
// Shows real-time credit balance in the navbar

import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

export default function CreditsBadge() {
  const { balance, loading } = useCredits();
  const navigate = useNavigate();

  if (loading) return null;

  const colorClass =
    balance === 0
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : balance <= 2
      ? 'bg-warning/10 text-warning border-warning/30'
      : 'bg-primary/10 text-primary border-primary/30';

  return (
    <button
      onClick={() => navigate('/buy-credits')}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-105',
        colorClass
      )}
      title="View credits"
    >
      <Zap className="h-3.5 w-3.5" />
      <span>{balance}</span>
      {balance === 0 && <span className="hidden sm:inline">— Top up</span>}
    </button>
  );
}
