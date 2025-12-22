import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Contest, ContestResult, Profile } from '@/lib/supabase';
import { Podium } from '@/components/leaderboard/Podium';
import { ShareResultCard } from '@/components/share/ShareResultCard';
import { 
  Trophy, 
  Clock, 
  User, 
  Lock,
  Share2,
  AlertCircle
} from 'lucide-react';
import { addMinutes } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LeaderboardEntry extends ContestResult {
  profile: Profile;
  rank: number;
}

function getContestStatus(contest: Contest): 'upcoming' | 'live' | 'ended' {
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);
  const now = new Date();

  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'live';
  return 'ended';
}

export default function Leaderboard() {
  const { user, profile: currentUserProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contest');
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<string | null>(contestId);
  const [selectedContestData, setSelectedContestData] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContestLocked, setIsContestLocked] = useState(false);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      const contest = contests.find(c => c.id === selectedContest);
      setSelectedContestData(contest || null);
      
      if (contest) {
        const status = getContestStatus(contest);
        setIsContestLocked(status === 'live' || status === 'upcoming');
      }
      
      fetchLeaderboard(selectedContest);
    } else {
      setSelectedContestData(null);
      setIsContestLocked(false);
      fetchGlobalLeaderboard();
    }
  }, [selectedContest, contests]);

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
      const { data: resultsData } = await supabase
        .from('contest_results')
        .select('*')
        .eq('contest_id', contestId)
        .not('completed_at', 'is', null)
        .order('score', { ascending: false })
        .order('time_taken_seconds', { ascending: true })
        .limit(100);

      if (resultsData && resultsData.length > 0) {
        const userIds = resultsData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap: Record<string, any> = {};
        profilesData?.forEach(p => { profileMap[p.id] = p; });

        const ranked = resultsData.map((entry: any, idx: number) => ({
          ...entry,
          profile: profileMap[entry.user_id],
          rank: idx + 1,
        }));
        setEntries(ranked);
      } else {
        setEntries([]);
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
      const { data: resultsData } = await supabase
        .from('contest_results')
        .select('user_id, score')
        .not('completed_at', 'is', null);

      if (resultsData && resultsData.length > 0) {
        const userScores: Record<string, { total: number; count: number }> = {};
        
        resultsData.forEach((entry: any) => {
          if (!userScores[entry.user_id]) {
            userScores[entry.user_id] = { total: 0, count: 0 };
          }
          userScores[entry.user_id].total += entry.score || 0;
          userScores[entry.user_id].count += 1;
        });

        const userIds = Object.keys(userScores);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap: Record<string, any> = {};
        profilesData?.forEach(p => { profileMap[p.id] = p; });

        const sorted = Object.entries(userScores)
          .map(([userId, data]) => ({
            user_id: userId,
            score: data.total,
            total_questions: data.count,
            profile: profileMap[userId],
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 100)
          .map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
          }));

        setEntries(sorted as any);
      } else {
        setEntries([]);
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

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
    if (rank === 2) return 'bg-slate-400/20 text-slate-400 border-slate-400/30';
    if (rank === 3) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    if (rank <= 10) return 'bg-primary/20 text-primary border-primary/30';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const currentUserEntry = user ? entries.find(e => e.user_id === user.id) : null;

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

        {/* Contest Locked Notice */}
        {isContestLocked && selectedContestData && (
          <div className="mb-8 p-6 rounded-xl bg-glow-warning/10 border border-glow-warning/30">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-glow-warning" />
              <div>
                <h3 className="font-semibold text-glow-warning">Leaderboard Locked</h3>
                <p className="text-sm text-muted-foreground">
                  Results will be visible after the contest ends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isContestLocked ? (
          <div className="text-center py-20">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Results Hidden</h3>
            <p className="text-muted-foreground">
              The leaderboard will be revealed after the contest ends.
            </p>
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-8">
            {/* Podium for Top 3 */}
            <Podium entries={entries} currentUserId={user?.id} />

            {/* Current User Highlight (if not in top 3) */}
            {currentUserEntry && currentUserEntry.rank > 3 && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge className={getRankBadgeStyle(currentUserEntry.rank)}>
                      #{currentUserEntry.rank}
                    </Badge>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={currentUserEntry.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {currentUserEntry.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{currentUserEntry.profile?.username} (You)</p>
                      <p className="text-sm text-muted-foreground">Your ranking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{currentUserEntry.score}</p>
                      <p className="text-sm text-muted-foreground">points</p>
                    </div>
                    {selectedContestData && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Share Your Result</DialogTitle>
                          </DialogHeader>
                          <ShareResultCard
                            contestName={selectedContestData.name}
                            rank={currentUserEntry.rank}
                            score={currentUserEntry.score || 0}
                            totalQuestions={currentUserEntry.total_questions || 0}
                            username={currentUserProfile?.username || 'Anonymous'}
                            avatarUrl={currentUserProfile?.avatar_url}
                            timeTaken={formatTime(currentUserEntry.time_taken_seconds as number)}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Full Ranking List (from rank 4 onwards) */}
            {entries.filter(e => e.rank > 3).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Full Rankings</h3>
                
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm text-muted-foreground">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">User</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Questions</div>
                  <div className="col-span-2 text-center">Time</div>
                </div>

                {entries.filter(e => e.rank > 3).map((entry) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  
                  return (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg transition-colors ${
                        isCurrentUser 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'bg-card border border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="col-span-2 md:col-span-1">
                        <Badge variant="outline" className={getRankBadgeStyle(entry.rank)}>
                          #{entry.rank}
                        </Badge>
                      </div>
                      <div className="col-span-10 md:col-span-5">
                        <Link 
                          to={`/profile/${entry.user_id}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={entry.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20">
                              {entry.profile?.username?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">
                            {entry.profile?.username || 'Anonymous'}
                            {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                          </span>
                        </Link>
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
                  );
                })}
              </div>
            )}
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
