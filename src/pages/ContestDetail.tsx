import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Contest, Question, ContestResult } from '@/lib/supabase';
import { 
  Clock, 
  Calendar, 
  ChevronRight,
  Play,
  Trophy,
  Users,
  AlertCircle,
  CheckCircle,
  Timer
} from 'lucide-react';
import { format, addMinutes, differenceInSeconds } from 'date-fns';

function getContestStatus(contest: Contest): 'upcoming' | 'live' | 'ended' {
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);
  const now = new Date();

  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'live';
  return 'ended';
}

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [userResult, setUserResult] = useState<ContestResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchContestDetails();
    }
  }, [id]);

  useEffect(() => {
    if (!contest) return;
    
    const updateTimer = () => {
      const status = getContestStatus(contest);
      const startTime = new Date(contest.start_time);
      const endTime = addMinutes(startTime, contest.duration_minutes);
      const now = new Date();

      if (status === 'upcoming') {
        const diff = differenceInSeconds(startTime, now);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (status === 'live') {
        const diff = differenceInSeconds(endTime, now);
        if (diff <= 0) {
          setTimeRemaining('Ended');
          return;
        }
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining('Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  const fetchContestDetails = async () => {
    try {
      const { data: contestData, error: contestError } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (contestError) throw contestError;
      if (!contestData) {
        navigate('/contests');
        return;
      }

      setContest(contestData as Contest);

      // Fetch questions
      const { data: cqData } = await supabase
        .from('contest_questions')
        .select('question_id, order_index')
        .eq('contest_id', id)
        .order('order_index');

      if (cqData && cqData.length > 0) {
        const questionIds = cqData.map(cq => cq.question_id);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds);
        
        if (questionsData) {
          // Sort by order
          const sortedQuestions = questionIds.map(qid => 
            questionsData.find(q => q.id === qid)
          ).filter(Boolean) as Question[];
          setQuestions(sortedQuestions);
        }
      }

      // Check user participation
      if (user) {
        const { data: resultData } = await supabase
          .from('contest_results')
          .select('*')
          .eq('contest_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (resultData) {
          setUserResult(resultData as ContestResult);
          setParticipating(true);
        }
      }
    } catch (error) {
      console.error('Error fetching contest:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contest details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startContest = async () => {
    if (!user || !contest) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to participate in contests.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const status = getContestStatus(contest);
    if (status !== 'live') {
      toast({
        title: 'Contest not live',
        description: 'This contest is not currently accepting submissions.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create or update contest result
      const { error } = await supabase
        .from('contest_results')
        .upsert({
          user_id: user.id,
          contest_id: contest.id,
          total_questions: questions.length,
          started_at: new Date().toISOString(),
        });

      if (error) throw error;
      navigate(`/quiz/${contest.id}`);
    } catch (error) {
      console.error('Error starting contest:', error);
      toast({
        title: 'Error',
        description: 'Failed to start contest. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-secondary rounded" />
            <div className="h-4 w-96 bg-secondary rounded" />
            <div className="h-64 bg-secondary rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!contest) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Contest not found</h2>
          <p className="text-muted-foreground mb-4">This contest doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/contests')}>View All Contests</Button>
        </div>
      </Layout>
    );
  }

  const status = getContestStatus(contest);
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);

  const statusConfig = {
    upcoming: {
      badge: 'Upcoming',
      color: 'bg-glow-warning/20 text-glow-warning border-glow-warning/30',
      timerLabel: 'Starts in',
    },
    live: {
      badge: 'Live Now',
      color: 'bg-glow-success/20 text-glow-success border-glow-success/30 animate-pulse',
      timerLabel: 'Ends in',
    },
    ended: {
      badge: 'Ended',
      color: 'bg-muted text-muted-foreground border-border',
      timerLabel: 'Contest ended',
    },
  };

  const config = statusConfig[status];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge className={`capitalize bg-primary/20 text-primary`}>
              {contest.contest_type}
            </Badge>
            <Badge variant="outline" className={config.color}>
              {config.badge}
            </Badge>
            <Badge variant="outline">
              {contest.contest_code}
            </Badge>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{contest.name}</h1>
          {contest.description && (
            <p className="text-muted-foreground text-lg max-w-3xl">{contest.description}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer Card */}
            <div className={`p-6 rounded-xl border ${
              status === 'live' ? 'bg-glow-success/5 border-glow-success/30' : 'bg-card border-border'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <Timer className={`h-6 w-6 ${status === 'live' ? 'text-glow-success animate-pulse' : 'text-muted-foreground'}`} />
                <span className="font-medium">{config.timerLabel}</span>
              </div>
              <p className={`text-4xl font-mono font-bold ${
                status === 'live' ? 'text-glow-success' : status === 'upcoming' ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {timeRemaining}
              </p>
            </div>

            {/* Contest Info */}
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <h3 className="font-semibold text-lg">Contest Details</h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Start Time</p>
                    <p className="font-medium">{format(startTime, 'PPP p')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{contest.duration_minutes} minutes</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-medium">{questions.length} questions</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Format</p>
                    <p className="font-medium">Output-based MCQ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Result (if participated) */}
            {userResult && userResult.completed_at && (
              <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg">Your Result</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <p className="text-3xl font-bold text-primary">{userResult.score}</p>
                    <p className="text-sm text-muted-foreground">Score</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <p className="text-3xl font-bold">{userResult.total_questions}</p>
                    <p className="text-sm text-muted-foreground">Total Questions</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background/50">
                    <p className="text-3xl font-bold">
                      {userResult.time_taken_seconds ? Math.floor(userResult.time_taken_seconds / 60) : 0}m
                    </p>
                    <p className="text-sm text-muted-foreground">Time Taken</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="p-6 rounded-xl bg-card border border-border sticky top-24">
              {status === 'live' && !userResult?.completed_at && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-glow-success mb-2">
                      <Play className="h-5 w-5" />
                      <span className="font-medium">Contest is Live!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Join now and test your coding knowledge.
                    </p>
                  </div>
                  <Button className="w-full" size="lg" onClick={startContest}>
                    {participating ? 'Continue Quiz' : 'Start Quiz'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}

              {status === 'upcoming' && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-glow-warning mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Coming Soon</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This contest hasn't started yet. Come back when it's live!
                    </p>
                  </div>
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    Waiting to Start
                  </Button>
                </>
              )}

              {status === 'ended' && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Contest Ended</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This contest has ended. Check the leaderboard for results.
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate(`/leaderboard?contest=${contest.id}`)}
                  >
                    View Leaderboard
                    <Trophy className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}

              {!user && status === 'live' && (
                <p className="text-sm text-center text-muted-foreground mt-4">
                  <a href="/auth" className="text-primary hover:underline">Sign in</a> to participate
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
