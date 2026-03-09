import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, ArrowLeft, Trophy, Medal, Crown, Flame, Zap } from 'lucide-react';
import { startOfWeek, startOfMonth, subWeeks, format } from 'date-fns';

type TimeFilter = 'this_week' | 'last_week' | 'this_month' | 'all_time';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_tests: number;
  avg_score: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_week');

  const getDateRange = (filter: TimeFilter): { from: string | null; to: string | null } => {
    const now = new Date();
    switch (filter) {
      case 'this_week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: now.toISOString() };
      case 'last_week': {
        const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
        const lastWeekEnd = startOfWeek(now, { weekStartsOn: 1 });
        return { from: lastWeekStart.toISOString(), to: lastWeekEnd.toISOString() };
      }
      case 'this_month':
        return { from: startOfMonth(now).toISOString(), to: now.toISOString() };
      case 'all_time':
        return { from: null, to: null };
    }
  };

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(timeFilter);

    let query = supabase
      .from('test_results')
      .select('user_id, score, profiles!inner(display_name)')
      .order('completed_at', { ascending: false });

    if (from) query = query.gte('completed_at', from);
    if (to) query = query.lte('completed_at', to);

    const { data } = await query;

    if (data) {
      const userMap: Record<string, { scores: number[]; name: string }> = {};
      data.forEach((r: any) => {
        if (!userMap[r.user_id]) {
          userMap[r.user_id] = { scores: [], name: r.profiles?.display_name || 'Anonymous' };
        }
        userMap[r.user_id].scores.push(Number(r.score));
      });

      const list = Object.entries(userMap).map(([userId, d]) => ({
        user_id: userId,
        display_name: d.name,
        total_tests: d.scores.length,
        avg_score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
      }));

      list.sort((a, b) => b.avg_score - a.avg_score || b.total_tests - a.total_tests);
      setEntries(list.slice(0, 50));
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, [timeFilter]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'test_results' },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLeaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="h-6 w-6 text-warning" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-muted-foreground" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-warning/70" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'this_week': return 'This Week';
      case 'last_week': return 'Last Week';
      case 'this_month': return 'This Month';
      case 'all_time': return 'All Time';
    }
  };

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

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
          <div className="ml-auto flex items-center gap-1.5 text-xs text-success">
            <Zap className="h-3.5 w-3.5" />
            <span>Live</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Top Performers</h1>
          <p className="text-muted-foreground text-sm">Rankings update in real-time</p>
        </div>

        {/* Time filter tabs */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="this_week">This Week</TabsTrigger>
            <TabsTrigger value="last_week">Last Week</TabsTrigger>
            <TabsTrigger value="this_month">This Month</TabsTrigger>
            <TabsTrigger value="all_time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No results for {getFilterLabel(timeFilter).toLowerCase()}. Be the first!</p>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 0, 2].map((podiumIndex) => {
                  const entry = topThree[podiumIndex];
                  if (!entry) return <div key={podiumIndex} />;
                  const isFirst = podiumIndex === 0;
                  return (
                    <Card
                      key={entry.user_id}
                      className={`p-4 text-center flex flex-col items-center gap-2 ${
                        isFirst ? 'border-primary/40 bg-primary/5 -mt-4 pb-6' : 'border-border'
                      }`}
                    >
                      <div className={`rounded-full flex items-center justify-center ${
                        isFirst ? 'h-14 w-14 bg-primary/10' : 'h-10 w-10 bg-accent'
                      }`}>
                        {getRankIcon(podiumIndex)}
                      </div>
                      <p className="font-semibold text-foreground text-sm truncate w-full">
                        {entry.display_name}
                      </p>
                      <p className={`text-xl font-bold ${
                        entry.avg_score >= 70 ? 'text-success' : entry.avg_score >= 50 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {entry.avg_score}%
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3" />
                        {entry.total_tests} tests
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Remaining entries */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry, index) => (
                  <Card key={entry.user_id} className="p-4 flex items-center gap-4">
                    {getRankIcon(index + 3)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{entry.display_name}</p>
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
          </>
        )}
      </main>
    </div>
  );
}
