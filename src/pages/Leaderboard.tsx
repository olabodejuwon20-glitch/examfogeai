import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap, ArrowLeft, Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_tests: number;
  avg_score: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // Get all results with profiles
    const { data } = await supabase
      .from('test_results')
      .select('user_id, score, profiles!inner(display_name)')
      .order('completed_at', { ascending: false });

    if (data) {
      const userMap: Record<string, { scores: number[]; name: string }> = {};
      data.forEach((r: any) => {
        if (!userMap[r.user_id]) {
          userMap[r.user_id] = { scores: [], name: r.profiles?.display_name || 'Anonymous' };
        }
        userMap[r.user_id].scores.push(Number(r.score));
      });

      const entries = Object.entries(userMap).map(([userId, data]) => ({
        user_id: userId,
        display_name: data.name,
        total_tests: data.scores.length,
        avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      }));

      entries.sort((a, b) => b.avg_score - a.avg_score);
      setEntries(entries.slice(0, 50));
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="h-6 w-6 text-warning" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-muted-foreground" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-warning/70" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Leaderboard</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Top Performers</h1>
          <p className="text-muted-foreground">Weekly leaderboard based on average scores</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No results yet. Be the first on the leaderboard!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <Card key={entry.user_id} className={`p-4 flex items-center gap-4 ${
                index < 3 ? 'border-primary/20 bg-accent/50' : ''
              }`}>
                {getRankIcon(index)}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{entry.display_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.total_tests} tests taken</p>
                </div>
                <span className={`text-lg font-bold ${
                  entry.avg_score >= 70 ? 'text-success' : entry.avg_score >= 50 ? 'text-warning' : 'text-destructive'
                }`}>
                  {entry.avg_score}%
                </span>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
