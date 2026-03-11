import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap, Plus, History, Trophy, LogOut, BookOpen, CheckCircle, Library, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { showBannerAd, hideBannerAd } from '@/lib/admob';
import AdSenseAd from '@/components/AdSenseAd';

interface TestRecord {
  id: string;
  title: string;
  status: string;
  num_questions: number;
  duration_minutes: number;
  created_at: string;
}

interface ResultRecord {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
  test: { title: string };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    showBannerAd();
    return () => { hideBannerAd(); };
  }, []);

  // Realtime credits balance
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-wallet')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'credits_wallet',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.balance !== undefined) setCredits(payload.new.balance);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [testsRes, resultsRes, walletRes] = await Promise.all([
      // ✅ FIXED: filter by current user only
      supabase.from('tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      // ✅ FIXED: filter by current user only
      supabase.from('test_results')
        .select('*, test:tests(title)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10),
      // ✅ NEW: load credit balance
      supabase.from('credits_wallet')
        .select('balance')
        .eq('user_id', user.id)
        .single(),
    ]);

    if (testsRes.data) setTests(testsRes.data);
    if (resultsRes.data) setResults(resultsRes.data as any);

    if (walletRes.data) {
      setCredits(walletRes.data.balance);
    } else {
      // Auto-create wallet if missing
      const { data } = await supabase
        .from('credits_wallet')
        .insert({ user_id: user.id, balance: 5 })
        .select('balance')
        .single();
      if (data) setCredits(data.balance);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const creditColor = () => {
    if (credits === null) return 'text-muted-foreground';
    if (credits === 0) return 'text-destructive';
    if (credits <= 2) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            {/* ✅ FIXED: branding from AutoExam → ExamForge */}
            <span className="text-xl font-bold text-foreground">ExamForge</span>
          </Link>
          <div className="flex items-center gap-1 md:gap-2">
            <Link to="/question-banks">
              <Button variant="ghost" size="sm">
                <Library className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Banks</span>
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm">
                <Trophy className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Button>
            </Link>
            {/* ✅ NEW: Credits button with live balance */}
            <Link to="/credits">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Zap className={`h-4 w-4 ${creditColor()}`} />
                <span className={`font-bold text-sm ${creditColor()}`}>
                  {credits ?? '...'}
                </span>
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome & CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Create AI-powered tests from your content</p>
          </div>
          <Link to="/create-test">
            <Button size="lg" className="font-semibold">
              <Plus className="h-5 w-5 mr-2" /> New Test
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tests.length}</p>
              <p className="text-sm text-muted-foreground">Tests Created</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
              <p className="text-sm text-muted-foreground">Tests Completed</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
              <Trophy className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {results.length > 0
                  ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </Card>
        </div>

        {/* Low credits warning */}
        {credits !== null && credits <= 2 && (
          <Card className={`p-4 mb-6 flex items-center justify-between gap-4 flex-wrap border ${
            credits === 0 ? 'border-destructive/40 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5'
          }`}>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {credits === 0 ? '😅 No credits left!' : `⚠️ Low credits — ${credits} remaining`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Buy credits or watch an ad to keep generating tests
              </p>
            </div>
            <Link to="/credits">
              <Button size="sm" variant={credits === 0 ? 'default' : 'outline'}>
                <Zap className="h-4 w-4 mr-1" /> Get Credits
              </Button>
            </Link>
          </Card>
        )}

        {/* Recent Tests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="h-5 w-5" /> Recent Tests
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : tests.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No tests yet. Create your first AI-generated test!</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {tests.map((test) => (
                <Card
                  key={test.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (test.status === 'ready') navigate(`/test/${test.id}`);
                    else if (test.status === 'completed') navigate(`/results/${test.id}`);
                  }}
                >
                  <div>
                    <h3 className="font-semibold text-foreground">{test.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {test.num_questions} questions • {test.duration_minutes} min
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    test.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                    test.status === 'ready' ? 'bg-primary/10 text-primary' :
                    test.status === 'generating' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {test.status}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Results */}
        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Recent Results
            </h2>
            <div className="grid gap-3">
              {results.map((result) => (
                <Card key={result.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{(result as any).test?.title || 'Test'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.correct_answers}/{result.total_questions} correct
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${
                    Number(result.score) >= 70 ? 'text-emerald-500' :
                    Number(result.score) >= 50 ? 'text-amber-500' : 'text-destructive'
                  }`}>
                    {Math.round(Number(result.score))}%
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <AdSenseAd adSlot="XXXXXXXXXX" className="text-center" />
        </div>
      </main>
    </div>
  );
}
