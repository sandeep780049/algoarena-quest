import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Contest } from '@/lib/supabase';
import { 
  Terminal, 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  Code2,
  ChevronRight,
  Star,
  Calendar,
  Play
} from 'lucide-react';
import { format, addMinutes, formatDistanceToNow } from 'date-fns';

function getContestStatus(contest: Contest): 'upcoming' | 'live' | 'ended' {
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);
  const now = new Date();

  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'live';
  return 'ended';
}

interface ContestWithCount extends Contest {
  registration_count?: number;
}

function ContestCard({ contest }: { contest: ContestWithCount }) {
  const status = getContestStatus(contest);
  const startTime = new Date(contest.start_time);

  const statusConfig = {
    upcoming: {
      badge: 'Upcoming',
      color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
      icon: Calendar,
    },
    live: {
      badge: 'Live Now',
      color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
      icon: Play,
    },
    ended: {
      badge: 'Ended',
      color: 'bg-muted text-muted-foreground border-border',
      icon: Trophy,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Link 
      to={`/contest/${contest.id}`}
      className={`block p-5 rounded-xl bg-card border transition-all duration-300 hover:scale-[1.02] ${
        status === 'live' ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <Badge className={`text-xs ${config.color}`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.badge}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {contest.contest_type}
        </Badge>
      </div>

      <h3 className="font-semibold mb-2 line-clamp-1">{contest.name}</h3>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {contest.duration_minutes}m
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {contest.registration_count || 0}
        </span>
        {status === 'upcoming' && (
          <span className="text-primary text-xs">
            {formatDistanceToNow(startTime, { addSuffix: true })}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Index() {
  const { user, isAdmin } = useAuth();
  const [liveContests, setLiveContests] = useState<ContestWithCount[]>([]);
  const [upcomingContests, setUpcomingContests] = useState<ContestWithCount[]>([]);
  const [dailyContests, setDailyContests] = useState<ContestWithCount[]>([]);
  const [weeklyContests, setWeeklyContests] = useState<ContestWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ questions: 0, users: 0, contests: 0 });

  useEffect(() => {
    fetchContests();
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    const [questionsRes, usersRes, contestsRes] = await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('contests').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ]);
    
    setStats({
      questions: questionsRes.count || 0,
      users: usersRes.count || 0,
      contests: contestsRes.count || 0,
    });
  };

  const fetchContests = async () => {
    try {
      // Fetch all published contests
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
        .eq('is_published', true)
        .order('start_time', { ascending: true });

      if (!contestsData) {
        setLoading(false);
        return;
      }

      // Fetch registration counts - use any since table was just created
      const { data: regCounts } = await (supabase as any)
        .from('contest_registrations')
        .select('contest_id');

      const countMap: Record<string, number> = {};
      (regCounts as any[])?.forEach((r: any) => {
        countMap[r.contest_id] = (countMap[r.contest_id] || 0) + 1;
      });

      const contestsWithCounts = contestsData.map(c => ({
        ...c,
        registration_count: countMap[c.id] || 0,
      })) as ContestWithCount[];

      // Categorize by status and type
      const now = new Date();
      const live: ContestWithCount[] = [];
      const upcoming: ContestWithCount[] = [];
      const daily: ContestWithCount[] = [];
      const weekly: ContestWithCount[] = [];

      contestsWithCounts.forEach(contest => {
        const status = getContestStatus(contest);
        
        if (status === 'live') {
          live.push(contest);
        } else if (status === 'upcoming') {
          upcoming.push(contest);
        }
        
        if (status !== 'ended') {
          if (contest.contest_type === 'daily') {
            daily.push(contest);
          } else if (contest.contest_type === 'weekly') {
            weekly.push(contest);
          }
        }
      });

      setLiveContests(live);
      setUpcomingContests(upcoming.slice(0, 6));
      setDailyContests(daily.slice(0, 4));
      setWeeklyContests(weekly.slice(0, 4));
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Code2,
      title: 'Output-Based Questions',
      description: 'Master your coding logic with carefully crafted output prediction challenges.'
    },
    {
      icon: Trophy,
      title: 'Live Contests',
      description: 'Compete in daily, weekly, and special contests against coders worldwide.'
    },
    {
      icon: Clock,
      title: 'Real-Time Scoring',
      description: 'Instant results and live leaderboards during active competitions.'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join a growing community of passionate programmers.'
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="absolute inset-0 bg-dots opacity-30" />
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              <span>Level up your coding skills</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Welcome to{' '}
              <span className="text-gradient">JC AlgoArena</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The ultimate coding quiz platform. Test your programming knowledge, 
              compete in live contests, and climb the leaderboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/contests">
                  <Button variant="hero" size="xl">
                    <Trophy className="h-5 w-5 mr-2" />
                    Browse Contests
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button variant="hero" size="xl">
                      Get Started Free
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <Link to="/contests">
                    <Button variant="outline" size="xl">
                      View Contests
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="grid grid-cols-3 gap-8 pt-6 max-w-lg mx-auto">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stats.questions || '0'}+</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stats.users || '0'}</p>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stats.contests || '0'}</p>
                  <p className="text-sm text-muted-foreground">Contests</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </section>

      {/* Live Contests */}
      {liveContests.length > 0 && (
        <section className="py-12 bg-emerald-500/5 border-y border-emerald-500/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Play className="h-6 w-6 text-emerald-500" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <h2 className="text-2xl font-bold">Live Now</h2>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                  {liveContests.length} active
                </Badge>
              </div>
              <Link to="/contests?filter=live">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveContests.slice(0, 3).map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-bold">Upcoming Contests</h2>
              </div>
              <Link to="/contests?filter=upcoming">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingContests.map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Daily & Weekly Contests */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Daily */}
            {dailyContests.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Daily Challenges</h3>
                </div>
                <div className="space-y-3">
                  {dailyContests.map(contest => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </div>
            )}

            {/* Weekly */}
            {weeklyContests.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="h-5 w-5 text-accent" />
                  <h3 className="text-xl font-bold">Weekly Competitions</h3>
                </div>
                <div className="space-y-3">
                  {weeklyContests.map(contest => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {dailyContests.length === 0 && weeklyContests.length === 0 && !loading && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active contests at the moment.</p>
              <Link to="/contests" className="text-primary hover:underline text-sm">
                View all contests
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="text-primary">AlgoArena</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience competitive programming like never before.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-card-gradient border border-border p-8 md:p-16">
            <div className="absolute inset-0 bg-hero-gradient opacity-30" />
            <div className="relative text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Test Your Skills?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of coders who are improving their skills daily.
              </p>
              <Link to={user ? "/contests" : "/auth?mode=signup"}>
                <Button variant="hero" size="xl">
                  <Terminal className="h-5 w-5 mr-2" />
                  {user ? 'Join a Contest' : 'Start Competing'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
