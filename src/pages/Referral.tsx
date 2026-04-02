import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Copy, Share2, Users, Gift, Phone,
  CheckCircle, Clock, AlertTriangle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralRecord {
  id: string;
  referred_id: string;
  status: string;
  airtime_amount: number;
  created_at: string;
}

export default function Referral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [totalAirtime, setTotalAirtime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    // Get or create referral code
    const { data: codeData } = await supabase.rpc('create_referral_code', { p_user_id: user!.id });
    if (codeData) setReferralCode(codeData as string);

    // Load referral code stats
    const { data: codeRow } = await supabase.from('referral_codes').select('*').eq('user_id', user!.id).single();
    if (codeRow) setTotalAirtime((codeRow as any).total_airtime_earned || 0);

    // Load referrals
    const { data: refs } = await supabase.from('referrals').select('*').eq('referrer_id', user!.id).order('created_at', { ascending: false });
    if (refs) setReferrals(refs as ReferralRecord[]);

    setLoading(false);
  };

  const referralLink = `examforge.app?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join ExamForge and get 5 free credits! Use my link to sign up: ${referralLink}`)}`, '_blank');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'qualified': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" />Qualified</Badge>;
      case 'paid': return <Badge className="bg-primary/10 text-primary border-primary/20"><Gift className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'fraud': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Invalid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <Users className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground">Invite Friends</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Invite Friends, Earn Airtime</h1>
          <p className="text-muted-foreground text-sm">Share your link and earn airtime for every friend who joins</p>
        </div>

        {/* Referral Link */}
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Your Referral Link</p>
          <div className="flex gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg text-sm text-foreground truncate">{referralLink}</code>
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button className="flex-1" onClick={copyLink}><Copy className="h-4 w-4 mr-2" /> Copy Link</Button>
            <Button className="flex-1" variant="outline" onClick={shareWhatsApp}>
              <Share2 className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          </div>
        </Card>

        {/* Reward Tiers */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Reward Tiers</h3>
          <div className="space-y-2">
            {[
              { range: '1–4 friends', amount: '₦50' },
              { range: '5–9 friends', amount: '₦100' },
              { range: '10+ friends', amount: '₦200' },
            ].map(tier => (
              <div key={tier.range} className="flex justify-between items-center p-3 rounded-lg bg-muted">
                <span className="text-sm text-foreground">{tier.range}</span>
                <span className="font-bold text-primary">{tier.amount} airtime each</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">+ 10 bonus credits per qualified referral (never expire!)</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">₦{totalAirtime.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Airtime Earned</p>
          </Card>
        </div>

        {/* Airtime delivery note */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Airtime is sent within 24 hours to your registered phone number.
          </p>
          {/* TODO: Connect to VTpass API (https://vtpass.com/documentation) or Reloadly API for real airtime delivery. Requires FLW_VTPASS_KEY environment variable. */}
        </Card>

        {/* Referral List */}
        {referrals.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-3">Your Referrals</h3>
            <div className="space-y-2">
              {referrals.map((ref, i) => (
                <Card key={ref.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Friend #{i + 1}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.airtime_amount > 0 && (
                      <span className="text-xs font-bold text-primary">₦{ref.airtime_amount}</span>
                    )}
                    {statusBadge(ref.status)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
