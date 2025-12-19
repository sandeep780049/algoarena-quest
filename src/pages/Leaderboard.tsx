import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { Contest, ContestResult, Profile } from '@/lib/supabase';
import { Trophy, Medal, Clock, User, ChevronDown } from 'lucide-react';

interface LeaderboardEntry extends ContestResult {
  profile: Profile;
  rank: number;
}

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contest');
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<string | null>(contestId);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      fetchLeaderboard(selectedContest);
    } else {
      fetchGlobalLeaderboard();
    }
  }, [selectedContest]);

  const fetchContests = async () => {
    const { data } = await supabase
      .from('contests')
      .select('*')
      .eq('is_published', true)
      .order('start_time', { ascending: false });
    
    setContests((data as Contest[]) || []);
  };

  const fetchLeaderboard = async (contestId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('contest_results')
        .select(`
          *,
          profiles:user_id (*)
        `)
        .eq('contest_id', contestId)
        .not('completed_at', 'is', null)
        .order('score', { ascending: false })
        .order('time_taken_seconds', { ascending: true })
        .limit(100);

      if (data) {
        const ranked = data.map((entry: any, idx: number) => ({
          ...entry,
          profile: entry.profiles,
          rank: idx + 1,
        }));
        setEntries(ranked);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalLeaderboard = async () => {
    setLoading(true);
    try {
      // For global, aggregate scores across all contests
      const { data } = await supabase
        .from('contest_results')
        .select(`
          user_id,
          score,
          profiles:user_id (*)
        `)
        .not('completed_at', 'is', null);

      if (data) {
        // Aggregate by user
        const userScores: Record<string, { total: number; count: number; profile: any }> = {};
        
        data.forEach((entry: any) => {
          if (!userScores[entry.user_id]) {
            userScores[entry.user_id] = {
              total: 0,
              count: 0,
              profile: entry.profiles,
            };
          }
          userScores[entry.user_id].total += entry.score || 0;
          userScores[entry.user_id].count += 1;
        });

        const sorted = Object.entries(userScores)
          .map(([userId, data]) => ({
            user_id: userId,
            score: data.total,
            total_questions: data.count,
            profile: data.profile,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 100)
          .map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
          }));

        setEntries(sorted as any);
      }
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 2:
        return 'bg-slate-400/20 text-slate-400 border-slate-400/30';
      case 3:
        return 'bg-orange-600/20 text-orange-600 border-orange-600/30';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const selectedContestData = contests.find(c => c.id === selectedContest);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <Trophy className="inline-block h-8 w-8 text-primary mr-3" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            {selectedContest ? 'Contest rankings' : 'Global rankings across all contests'}
          </p>
        </div>

        {/* Contest Selector */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedContest ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedContest(null)}
            >
              Global
            </Button>
            {contests.slice(0, 5).map((contest) => (
              <Button
                key={contest.id}
                variant={selectedContest === contest.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedContest(contest.id)}
              >
                {contest.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">User</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Questions</div>
              <div className="col-span-2 text-center">Time</div>
            </div>

            {/* Top 3 Showcase */}
            {entries.slice(0, 3).length > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {entries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`p-6 rounded-xl border-2 ${getRankStyle(entry.rank)} text-center`}
                  >
                    <div className="mb-4">
                      {entry.rank === 1 && <Trophy className="h-12 w-12 mx-auto text-amber-500" />}
                      {entry.rank === 2 && <Medal className="h-12 w-12 mx-auto text-slate-400" />}
                      {entry.rank === 3 && <Medal className="h-12 w-12 mx-auto text-orange-600" />}
                    </div>
                    <div className="text-2xl font-bold mb-1">#{entry.rank}</div>
                    <div className="font-semibold mb-2">
                      {entry.profile?.username || 'Anonymous'}
                    </div>
                    <div className="text-3xl font-bold text-primary">{entry.score}</div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>
                ))}
              </div>
            )}

            {/* Rest of leaderboard */}
            {entries.slice(3).map((entry) => (
              <div
                key={entry.user_id}
                className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="col-span-2 md:col-span-1">
                  <Badge variant="outline" className={getRankStyle(entry.rank)}>
                    #{entry.rank}
                  </Badge>
                </div>
                <div className="col-span-10 md:col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium truncate">
                    {entry.profile?.username || 'Anonymous'}
                  </span>
                </div>
                <div className="col-span-4 md:col-span-2 text-center">
                  <span className="text-lg font-bold text-primary">{entry.score}</span>
                </div>
                <div className="col-span-4 md:col-span-2 text-center text-muted-foreground">
                  {entry.total_questions || '-'}
                </div>
                <div className="col-span-4 md:col-span-2 text-center text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {formatTime(entry.time_taken_seconds as number)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No results yet</h3>
            <p className="text-muted-foreground">
              {selectedContest 
                ? 'No one has completed this contest yet.'
                : 'Be the first to compete and claim your spot!'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
