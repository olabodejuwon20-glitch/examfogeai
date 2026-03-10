// src/components/credits/OutOfCreditsModal.tsx
// Friendly modal shown when user runs out of credits

import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, PlayCircle, RotateCcw } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { showRewardedAd } from '@/lib/admob';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function OutOfCreditsModal({ open, onClose }: OutOfCreditsModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addCredits } = useCredits();

  const handleWatchAd = async () => {
    if (!user) return;
    try {
      const rewarded = await showRewardedAd(user.id);
      if (rewarded) {
        await addCredits(1, 'rewarded_ad', 'Earned from watching video ad');
        toast.success('🎉 You earned 1 free credit!');
        onClose();
      } else {
        toast.error('Ad not available right now. Try again later.');
      }
    } catch {
      toast.error('Ad not available right now. Try again later.');
    }
  };

  const handleBuyCredits = () => {
    onClose();
    navigate('/buy-credits');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            You're out of credits 😅
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            You need 1 credit to generate a test. Here's how to get more:
          </p>

          {/* Watch Ad Option */}
          <button
            onClick={handleWatchAd}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Watch a 30s video</p>
              <p className="text-xs text-muted-foreground">Earn 1 free credit instantly</p>
            </div>
            <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
              FREE
            </span>
          </button>

          {/* Buy Credits Option */}
          <button
            onClick={handleBuyCredits}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Buy credit pack</p>
              <p className="text-xs text-muted-foreground">Starting from $1.99 for 20 credits</p>
            </div>
            <span className="ml-auto text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-full">
              $1.99+
            </span>
          </button>

          {/* Daily Free Credits Note */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
            <RotateCcw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Come back tomorrow for <span className="font-semibold text-foreground">2 free daily credits</span>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Credits never expire once purchased ✦
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
