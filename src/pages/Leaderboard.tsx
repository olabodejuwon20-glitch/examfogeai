import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap, ArrowLeft, Trophy, Medal, Crown,
  Flame, Zap, Star, User
} from 'lucide-react';
import { startOfWeek, startOfMonth, subWeeks } from 'date-fns';

type TimeFilter = 'this_week' | 'last_week' | 'this_month' | 'all_time';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_tests: number;
  avg_score: number;
  rank: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
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

      const fullList: LeaderboardEntry[] = Object.entries(userMap)
        .map(([userId, d]) => ({
          user_id: userId,
          display_name: d.name,
          total_tests: d.scores.length,
          avg_score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
          rank: 0,
        }))
        .sort((a, b) => b.avg_score - a.avg_score || b.total_tests - a.total_tests)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Find current user's rank from the FULL list
      const myEntry = fullList.find((e) => e.user_id === user?.id);
      const top50 = fullList.slice(0, 50);

      // If current user is NOT in top 50 but exists in full list, store separately
      const isInTop50 = top50.some((e) => e.user_id === user?.id);
      setMyRank(!isInTop50 && myEntry ? myEntry : null);
      setEntries(top50);
    } else {
      setEntries([]);
      setMyRank(null);
    }
    setLoading(false);
  }, [timeFilter, user?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_results' }, () => {
        loadLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeaderboard]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">
        {rank}
      </span>
    );
  };

  const getPodiumHeight = (position: number) => {
    if (position === 1) return 'pb-8 pt-2';
    if (position === 2) return 'pb-4';
    return 'pb-2';
  };

  const getPodiumBorder = (position: number) => {
    if (position === 1) return 'border-amber-400/40 bg-amber-400/5 shadow-lg shadow-amber-400/10';
    if (position === 2) return 'border-slate-400/30 bg-slate-400/5';
    return 'border-amber-700/30 bg-amber-700/5';
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

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [
    { index: 1, position: 2 },
    { index: 0, position: 1 },
    { index: 2, position: 3 },
  ];

  const isCurrentUser = (userId: string) => userId === user?.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 backdrop-blur-sm">
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
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <Zap className="h-3.5 w-3.5 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 blur-xl bg-amber-400/20 rounded-full" />
            <Trophy className="relative h-14 w-14 text-amber-400 mx-auto" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Top Performers</h1>
          <p className="text-muted-foreground text-sm mt-1">Rankings update in real-time</p>
        </div>

        {/* Time filter */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="this_week">Week</TabsTrigger>
            <TabsTrigger value="last_week">Last Week</TabsTrigger>
            <TabsTrigger value="this_month">Month</TabsTrigger>
            <TabsTrigger value="all_time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No results for {getFilterLabel(timeFilter).toLowerCase()}.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to take a test!</p>
            <Link to="/create-test">
              <Button className="mt-4" size="sm">Create a Test</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* ===== PODIUM TOP 3 ===== */}
            {topThree.length > 0 && (
              <div className="flex items-end justify-center gap-3 mb-8 px-2">
                {podiumOrder.map(({ index, position }) => {
                  const entry = topThree[index];
                  if (!entry) return <div key={position} className="flex-1" />;
                  const isMe = isCurrentUser(entry.user_id);

                  return (
                    <div key={entry.user_id} className="flex-1 flex flex-col items-center">
                      {/* Crown / medal above card */}
                      <div className={`mb-2 flex flex-col items-center ${position === 1 ? 'scale-110' : ''}`}>
                        {position === 1 && <Crown className="h-6 w-6 text-amber-400 mb-1" />}
                        {position === 2 && <Medal className="h-5 w-5 text-slate-400 mb-1" />}
                        {position === 3 && <Medal className="h-5 w-5 text-amber-700 mb-1" />}
                      </div>

                      <Card className={`
                        w-full border-2 flex flex-col items-center text-center
                        transition-all duration-200 hover:scale-105
                        ${getPodiumBorder(position)}
                        ${getPodiumHeight(position)}
                        ${isMe ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                        p-3 pt-4
                      `}>
                        {/* Avatar */}
                        <div className={`
                          rounded-full flex items-center justify-center mb-2 font-bold text-white
                          ${position === 1 ? 'h-12 w-12 text-base bg-amber-400' : 'h-10 w-10 text-sm bg-muted-foreground/40'}
                        `}>
                          {entry.display_name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name */}
                        <p className={`font-semibold text-foreground truncate w-full text-xs ${position === 1 ? 'text-sm' : ''}`}>
                          {entry.display_name}
                          {isMe && <span className="ml-1 text-primary">★</span>}
                        </p>

                        {/* Score */}
                        <p className={`font-extrabold mt-1 ${getScoreColor(entry.avg_score)} ${position === 1 ? 'text-2xl' : 'text-xl'}`}>
                          {entry.avg_score}%
                        </p>

                        {/* Tests */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Flame className="h-3 w-3" />
                          <span>{entry.total_tests} test{entry.total_tests !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Position badge */}
                        <div className={`
                          mt-2 text-xs font-bold px-2 py-0.5 rounded-full
                          ${position === 1 ? 'bg-amber-400/20 text-amber-500' : ''}
                          ${position === 2 ? 'bg-slate-400/20 text-slate-400' : ''}
                          ${position === 3 ? 'bg-amber-700/20 text-amber-700' : ''}
                        `}>
                          #{position}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== REST OF LIST ===== */}
            {rest.length > 0 && (
              <div className="space-y-2 mb-6">
                {rest.map((entry) => {
                  const isMe = isCurrentUser(entry.user_id);
                  return (
                    <Card
                      key={entry.user_id}
                      className={`
                        p-4 flex items-center gap-4 transition-all duration-150
                        hover:shadow-md
                        ${isMe
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border'
                        }
                      `}
                    >
                      {/* Rank */}
                      <div className="w-7 flex justify-center flex-shrink-0">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar initial */}
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-accent-foreground flex-shrink-0">
                        {entry.display_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name & tests */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {entry.display_name}
                          {isMe && (
                            <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Flame className="h-3 w-3" />
                          <span>{entry.total_tests} test{entry.total_tests !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Score badge */}
                      <div className={`px-3 py-1 rounded-full border text-sm font-bold ${getScoreBg(entry.avg_score)} ${getScoreColor(entry.avg_score)}`}>
                        {entry.avg_score}%
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ===== YOUR RANK (if outside top 50) ===== */}
            {myRank && (
              <div className="mt-6 pt-6 border-t border-border border-dashed">
                <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider font-medium">
                  Your Ranking
                </p>
                <Card className="p-4 flex items-center gap-4 border-primary/50 bg-primary/5 ring-1 ring-primary/30">
                  <div className="w-7 flex justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                    {myRank.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {myRank.display_name}
                      <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Star className="h-3 w-3" />
                      <span>Rank #{myRank.rank} • {myRank.total_tests} test{myRank.total_tests !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-bold ${getScoreBg(myRank.avg_score)} ${getScoreColor(myRank.avg_score)}`}>
                    {myRank.avg_score}%
                  </div>
                </Card>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Take more tests to climb into the top 50! 🚀
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
