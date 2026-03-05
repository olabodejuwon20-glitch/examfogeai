import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap, Plus, History, Trophy, LogOut, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [testsRes, resultsRes] = await Promise.all([
      supabase.from('tests').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('test_results').select('*, test:tests(title)').order('completed_at', { ascending: false }).limit(10),
    ]);
    if (testsRes.data) setTests(testsRes.data);
    if (resultsRes.data) setResults(resultsRes.data as any);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">AutoExam</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm">
                <Trophy className="h-4 w-4 mr-1" /> Leaderboard
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

        {/* Recent Tests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="h-5 w-5" /> Recent Tests
          </h2>
          {tests.length === 0 ? (
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
                    test.status === 'completed' ? 'bg-success/10 text-success' :
                    test.status === 'ready' ? 'bg-primary/10 text-primary' :
                    test.status === 'generating' ? 'bg-warning/10 text-warning' :
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
                    Number(result.score) >= 70 ? 'text-success' : Number(result.score) >= 50 ? 'text-warning' : 'text-destructive'
                  }`}>
                    {Math.round(Number(result.score))}%
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
