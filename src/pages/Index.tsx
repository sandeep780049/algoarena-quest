import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Contest } from '@/lib/supabase';
import { GATE_SUBJECTS } from '@/lib/gate-subjects';
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
  Play,
  GraduationCap,
  BookOpen,
  BarChart3,
  Award,
  Target,
  TrendingUp,
  FileText,
  Timer
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
      color: 'bg-glow-warning/20 text-glow-warning border-glow-warning/30',
      icon: Calendar,
    },
    live: {
      badge: 'Live Now',
      color: 'bg-glow-success/20 text-glow-success border-glow-success/30',
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

  const typeColors: Record<string, string> = {
    daily: 'bg-primary/20 text-primary',
    weekly: 'bg-accent/20 text-accent',
    special: 'bg-glow-warning/20 text-glow-warning',
    gate: 'bg-glow-success/20 text-glow-success',
  };

  return (
    <Link 
      to={`/contest/${contest.id}`}
      className={`block p-5 rounded-xl bg-card border transition-all duration-300 hover:scale-[1.02] ${
        status === 'live' ? 'border-glow-success/50 glow-success' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <Badge className={`text-xs ${config.color}`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.badge}
        </Badge>
        <Badge variant="outline" className={`text-xs capitalize ${typeColors[contest.contest_type] || ''}`}>
          {contest.contest_type === 'gate' ? '🎓 GATE' : contest.contest_type}
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
  const navigate = useNavigate();
  const [liveContests, setLiveContests] = useState<ContestWithCount[]>([]);
  const [upcomingContests, setUpcomingContests] = useState<ContestWithCount[]>([]);
  const [dailyContests, setDailyContests] = useState<ContestWithCount[]>([]);
  const [weeklyContests, setWeeklyContests] = useState<ContestWithCount[]>([]);
  const [gateContests, setGateContests] = useState<ContestWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ questions: 0, users: 0, contests: 0, gateQuestions: 0 });
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchContests();
    fetchStats();
    fetchSubjectCounts();
  }, []);

  const fetchStats = async () => {
    const [questionsRes, usersRes, contestsRes, gateRes] = await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('contests').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('gate_questions').select('id', { count: 'exact', head: true }),
    ]);
    
    setStats({
      questions: questionsRes.count || 0,
      users: usersRes.count || 0,
      contests: contestsRes.count || 0,
      gateQuestions: gateRes.count || 0,
    });
  };

  const fetchSubjectCounts = async () => {
    const { data } = await supabase.from('gate_questions').select('subject');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((q: any) => {
        counts[q.subject] = (counts[q.subject] || 0) + 1;
      });
      setSubjectCounts(counts);
    }
  };

  const fetchContests = async () => {
    try {
      const { data: contestsData } = await supabase
        .from('contests')
        .select('*')
        .eq('is_published', true)
        .order('start_time', { ascending: true });

      if (!contestsData) {
        setLoading(false);
        return;
      }

      const countsResults = await Promise.all(
        contestsData.map(c => 
          supabase.rpc('get_contest_registration_count', { p_contest_id: c.id })
        )
      );

      const contestsWithCounts = contestsData.map((c, i) => ({
        ...c,
        registration_count: countsResults[i].data || 0,
      })) as ContestWithCount[];

      const live: ContestWithCount[] = [];
      const upcoming: ContestWithCount[] = [];
      const daily: ContestWithCount[] = [];
      const weekly: ContestWithCount[] = [];
      const gate: ContestWithCount[] = [];

      contestsWithCounts.forEach(contest => {
        const status = getContestStatus(contest);
        
        if (status === 'live') live.push(contest);
        else if (status === 'upcoming') upcoming.push(contest);
        
        if (status !== 'ended') {
          if (contest.contest_type === 'daily') daily.push(contest);
          else if (contest.contest_type === 'weekly') weekly.push(contest);
          else if (contest.contest_type === 'gate') gate.push(contest);
        }
      });

      setLiveContests(live);
      setUpcomingContests(upcoming.slice(0, 6));
      setDailyContests(daily.slice(0, 4));
      setWeeklyContests(weekly.slice(0, 4));
      setGateContests(gate.slice(0, 3));
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Code2, title: 'Output-Based Questions', description: 'Master your coding logic with carefully crafted output prediction challenges.' },
    { icon: Trophy, title: 'Live Contests', description: 'Compete in daily, weekly, and special contests against coders worldwide.' },
    { icon: Clock, title: 'Real-Time Scoring', description: 'Instant results and live leaderboards during active competitions.' },
    { icon: Users, title: 'Community Driven', description: 'Join a growing community of passionate programmers.' }
  ];

  const gateFeatures = [
    { icon: BookOpen, title: 'Subject-Wise Practice', description: 'Practice GATE questions organized by subject and topic for focused preparation.' },
    { icon: Timer, title: 'Mock GATE Contests', description: 'Participate in timed contests that simulate the real GATE exam experience.' },
    { icon: BarChart3, title: 'Leaderboard Rankings', description: 'Compare your performance with other students and track your standing.' },
    { icon: TrendingUp, title: 'Progress Tracking', description: 'Track solved questions, accuracy, and improvement over time.' },
    { icon: Award, title: 'Certificates', description: 'Earn certificates of achievement after completing GATE contests.' },
  ];

  return (
    <Layout>
      <SEO 
        title="Home"
        description="JC AlgoArena - The ultimate coding quiz platform. Test your programming knowledge, compete in live contests, and climb the leaderboard."
        path="/"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" />
        
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
                <>
                  <Button variant="hero" size="xl" onClick={() => navigate('/contests')}>
                    <Trophy className="h-5 w-5 mr-2" />
                    Browse Contests
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  <Button variant="outline" size="xl" onClick={() => navigate('/gate-practice')}>
                    <GraduationCap className="h-5 w-5 mr-2" />
                    GATE Practice
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="hero" size="xl" onClick={() => navigate('/auth/signup')}>
                    Get Started Free
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  <Button variant="outline" size="xl" onClick={() => navigate('/contests')}>
                    View Contests
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.gateQuestions || '200'}+</p>
                <p className="text-xs text-muted-foreground mt-1">GATE Questions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.contests || '50'}+</p>
                <p className="text-xs text-muted-foreground mt-1">Practice Tests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-accent">Weekly</p>
                <p className="text-xs text-muted-foreground mt-1">GATE Contests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.users || '0'}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Learners</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </section>

      {/* Live Contests */}
      {liveContests.length > 0 && (
        <section className="py-12 bg-glow-success/5 border-y border-glow-success/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Play className="h-6 w-6 text-glow-success" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-glow-success rounded-full animate-ping" />
                </div>
                <h2 className="text-2xl font-bold">Live Now</h2>
                <Badge className="bg-glow-success/20 text-glow-success border-glow-success/30">
                  {liveContests.length} active
                </Badge>
              </div>
              <Link to="/contests?filter=live">
                <Button variant="ghost" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* GATE CSE Preparation Section */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="container mx-auto px-4 relative">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-glow-success/10 border border-glow-success/20 text-glow-success text-sm font-medium mb-4">
              <GraduationCap className="h-4 w-4" />
              <span>GATE CSE 2026</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              GATE CSE <span className="text-gradient">Preparation</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Practice subject-wise GATE Computer Science questions and prepare effectively with quizzes, contests, and performance tracking.
            </p>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {GATE_SUBJECTS.map((subject) => {
              const count = subjectCounts[subject.id] || 0;
              const SubjectIcon = subject.icon;
              return (
                <Link
                  key={subject.id}
                  to={`/gate-practice/${subject.id}`}
                  className="group relative p-4 md:p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.03]"
                >
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${subject.color}10, transparent)` }} />
                  <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ background: `${subject.color}20` }}>
                      <SubjectIcon className="h-5 w-5 md:h-6 md:w-6" style={{ color: subject.color }} />
                    </div>
                    <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-2">{subject.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">{count} questions</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 hidden md:block">{subject.description}</p>
                    <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Practice Now <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Start GATE Practice CTA */}
          <div className="text-center">
            <Button asChild variant="hero" size="xl" className="glow-primary">
              <Link to="/gate-practice">
                <GraduationCap className="h-5 w-5 mr-2" />
                Start GATE Practice
                <ChevronRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* GATE Contests Section */}
      {gateContests.length > 0 && (
        <section className="py-12 bg-secondary/30 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-glow-success" />
                <h2 className="text-2xl font-bold">GATE Contests</h2>
                <Badge className="bg-glow-success/20 text-glow-success border-glow-success/30">
                  {gateContests.length} available
                </Badge>
              </div>
              <Link to="/contests">
                <Button variant="ghost" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateContests.map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GATE Features Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for <span className="text-gradient">GATE Prep</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform designed to help you crack GATE CSE with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {gateFeatures.map((feature) => (
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

      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-glow-warning" />
                <h2 className="text-2xl font-bold">Upcoming Contests</h2>
              </div>
              <Link to="/contests?filter=upcoming">
                <Button variant="ghost" size="sm">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
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
              <Link to="/contests" className="text-primary hover:underline text-sm">View all contests</Link>
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild variant="hero" size="xl">
                  <Link to={user ? "/contests" : "/auth/signup"}>
                    <Terminal className="h-5 w-5 mr-2" />
                    {user ? 'Join a Contest' : 'Start Competing'}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="xl">
                  <Link to="/gate-practice">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    GATE Practice
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section for SEO */}
      <section className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link 
              to="/gate-practice" 
              className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <GraduationCap className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold">GATE Practice</h3>
                <p className="text-sm text-muted-foreground">Subject-wise preparation</p>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link 
              to="/contests" 
              className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <Trophy className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold">All Contests</h3>
                <p className="text-sm text-muted-foreground">Browse challenges</p>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link 
              to="/leaderboard" 
              className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <BarChart3 className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">See top performers</p>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            {!user ? (
              <Link 
                to="/auth/signup" 
                className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <Users className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-semibold">Create Account</h3>
                  <p className="text-sm text-muted-foreground">Join free</p>
                </div>
                <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ) : (
              <Link 
                to="/profile" 
                className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <Target className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-semibold">Your Profile</h3>
                  <p className="text-sm text-muted-foreground">Track progress</p>
                </div>
                <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
