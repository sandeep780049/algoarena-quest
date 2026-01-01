import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Contest } from '@/lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Timer,
  Flag,
  Trophy,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { addMinutes, differenceInSeconds } from 'date-fns';

interface QuizQuestion {
  id: string;
  question_text: string;
  code_block: string | null;
  options: string[];
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number;
}

interface MyContestResultResponse {
  score: number;
  total_questions: number;
  time_taken_seconds: number;
  completed_at: string;
}

interface SubmitQuizResponse {
  success?: boolean;
  error?: string;
  already_submitted?: boolean;
  score?: number;
  total_questions?: number;
  time_taken_seconds?: number;
  percentage?: number;
}

export default function Quiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  
  // Prevent double submission
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      // Store intended destination for redirect after login
      sessionStorage.setItem('redirectAfterAuth', `/quiz/${id}`);
      navigate('/auth');
      return;
    }
    if (id) {
      fetchQuizData();
    }
  }, [id, user]);

  useEffect(() => {
    if (!contest || !startedAt || hasCompleted || quizResult) return;
    
    const endTime = addMinutes(new Date(contest.start_time), contest.duration_minutes);
    
    const updateTimer = () => {
      const now = new Date();
      const diff = differenceInSeconds(endTime, now);
      
      if (diff <= 0) {
        // Auto-submit when time runs out
        handleSubmit();
        return;
      }
      
      setTimeRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contest, startedAt, hasCompleted, quizResult]);

  const fetchQuizData = async () => {
    try {
      // Fetch contest
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

      const contestTyped = contestData as Contest;
      setContest(contestTyped);

      // Check if contest is live
      const startTime = new Date(contestTyped.start_time);
      const endTime = addMinutes(startTime, contestTyped.duration_minutes);
      const now = new Date();

      if (now < startTime || now >= endTime) {
        toast({
          title: 'Contest not available',
          description: 'This contest is not currently accepting submissions.',
          variant: 'destructive',
        });
        navigate(`/contest/${id}`);
        return;
      }

      // Check if user has COMPLETED this contest using secure function
      if (user) {
        const { data: existingResultData } = await supabase.rpc('get_my_contest_result', {
          p_contest_id: id
        });

        const existingResult = existingResultData as unknown as MyContestResultResponse | null;

        if (existingResult) {
          // User has already submitted - show their result
          setHasCompleted(true);
          setQuizResult({
            score: existingResult.score || 0,
            totalQuestions: existingResult.total_questions || 0,
            percentage: existingResult.total_questions 
              ? Math.round((existingResult.score || 0) / existingResult.total_questions * 100) 
              : 0,
            timeTaken: existingResult.time_taken_seconds || 0,
          });
          setLoading(false);
          return;
        }
      }

      // SECURITY: Use secure RPC function that never exposes correct_answer
      const { data: questionsData, error: questionsError } = await supabase
        .rpc('get_contest_questions', { p_contest_id: id });

      if (questionsError) {
        throw new Error(questionsError.message);
      }
      
      if (questionsData && questionsData.length > 0) {
        // Cast to unknown first to handle Json type from RPC response
        const formattedQuestions: QuizQuestion[] = (questionsData as unknown as Array<{
          id: string;
          question_text: string;
          code_block: string | null;
          options: string[];
        }>).map((q) => ({
          id: q.id,
          question_text: q.question_text,
          code_block: q.code_block,
          options: Array.isArray(q.options) ? q.options : []
        }));
        setQuestions(formattedQuestions);
      }

      // Load existing answers from submissions (in case user refreshed)
      if (user) {
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('question_id, selected_answer')
          .eq('contest_id', id)
          .eq('user_id', user.id);
        
        if (submissionsData) {
          const savedAnswers: Record<string, number> = {};
          submissionsData.forEach(sub => {
            savedAnswers[sub.question_id] = sub.selected_answer;
          });
          setAnswers(savedAnswers);
        }
      }

      // Set start time
      setStartedAt(new Date());
      
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save answer using secure server-side function
  const saveAnswer = async (questionId: string, answerIndex: number) => {
    if (!user || !contest) return;

    try {
      // Use secure RPC function - server validates and saves without exposing correct answer
      const { data, error } = await supabase.rpc('save_quiz_answer', {
        p_contest_id: contest.id,
        p_question_id: questionId,
        p_selected_answer: answerIndex
      });
      
      if (error) {
        console.error('Error saving answer:', error);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const selectAnswer = (answerIndex: number) => {
    const question = questions[currentIndex];
    if (!question || hasCompleted || quizResult) return;

    setAnswers(prev => ({
      ...prev,
      [question.id]: answerIndex,
    }));

    saveAnswer(question.id, answerIndex);
  };

  const handleSubmit = useCallback(async () => {
    // Prevent double submission using ref (works across renders)
    if (!user || !contest || isSubmittingRef.current || quizResult || hasCompleted) return;
    
    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      // Use secure server-side function to submit and calculate score
      const { data: responseData, error } = await supabase.rpc('submit_quiz_answers', {
        p_contest_id: contest.id,
        p_answers: answers,
        p_started_at: startedAt?.toISOString() || new Date().toISOString()
      });

      if (error) throw error;

      const data = responseData as SubmitQuizResponse | null;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.already_submitted) {
        // Already submitted - show existing result
        setQuizResult({
          score: data.score || 0,
          totalQuestions: data.total_questions || 0,
          percentage: data.total_questions 
            ? Math.round((data.score || 0) / data.total_questions * 100) 
            : 0,
          timeTaken: data.time_taken_seconds || 0,
        });
        setHasCompleted(true);
        toast({
          title: 'Quiz already submitted',
          description: 'Showing your previous result.',
        });
        return;
      }

      const percentage = (data?.total_questions || 0) > 0 
        ? Math.round(((data?.score || 0) / (data?.total_questions || 1)) * 100) 
        : 0;

      setQuizResult({
        score: data?.score || 0,
        totalQuestions: data?.total_questions || 0,
        percentage,
        timeTaken: data?.time_taken_seconds || 0,
      });
      setHasCompleted(true);

      toast({
        title: 'Quiz submitted!',
        description: `You scored ${data?.score || 0} out of ${data?.total_questions || 0} (${percentage}%)`,
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quiz. Please try again.',
        variant: 'destructive',
      });
      // Reset the ref so user can try again
      isSubmittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [user, contest, startedAt, answers, quizResult, hasCompleted, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show result screen if already completed
  if (quizResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="mb-6">
              {quizResult.percentage >= 70 ? (
                <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto" />
              ) : quizResult.percentage >= 40 ? (
                <Trophy className="h-20 w-20 text-amber-500 mx-auto" />
              ) : (
                <XCircle className="h-20 w-20 text-destructive mx-auto" />
              )}
            </div>

            <h1 className="text-2xl font-bold mb-2">
              Quiz Completed!
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Great job completing the quiz!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-secondary">
                <p className="text-3xl font-bold text-primary">{quizResult.score}</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary">
                <p className="text-3xl font-bold">{quizResult.totalQuestions}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary">
                <p className="text-3xl font-bold text-primary">{quizResult.percentage}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted mb-6">
              <p className="text-sm text-muted-foreground">Time Taken</p>
              <p className="text-xl font-mono font-bold">
                {Math.floor(quizResult.timeTaken / 60)}m {quizResult.timeTaken % 60}s
              </p>
            </div>

            <div className="space-y-3">
              <Link to={`/leaderboard?contest=${contest?.id}`} className="block">
                <Button className="w-full" size="lg">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Leaderboard
                </Button>
              </Link>
              <Link to="/contests" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Browse More Contests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contest || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Quiz not available</h2>
          <Button onClick={() => navigate('/contests')}>Back to Contests</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = Array.isArray(currentQuestion.options) 
    ? currentQuestion.options as string[]
    : [];
  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeRemaining < 60;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold truncate max-w-[200px] md:max-w-none">
                {contest.name}
              </h1>
              <Badge variant="outline">
                {answeredCount}/{questions.length} answered
              </Badge>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isUrgent ? 'bg-destructive/20 text-destructive' : 'bg-secondary'
            }`}>
              <Timer className={`h-4 w-4 ${isUrgent ? 'animate-pulse' : ''}`} />
              <span className={`font-mono font-bold ${isUrgent ? 'timer-urgent' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Question Navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {questions.map((q, idx) => (
              <Button
                key={q.id}
                variant={currentIndex === idx ? 'default' : 'outline'}
                size="sm"
                className={`w-10 h-10 p-0 ${
                  answers[q.id] !== undefined 
                    ? 'bg-primary/20 border-primary' 
                    : ''
                }`}
                onClick={() => setCurrentIndex(idx)}
              >
                {idx + 1}
              </Button>
            ))}
          </div>

          {/* Question Card */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <Badge variant="secondary">Question {currentIndex + 1}</Badge>
              {answers[currentQuestion.id] !== undefined && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Flag className="h-3 w-3 mr-1" />
                  Answered
                </Badge>
              )}
            </div>

            <h2 className="text-lg md:text-xl font-medium mb-6">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.code_block && (
              <pre className="bg-secondary p-4 rounded-lg mb-6 overflow-x-auto text-sm font-mono">
                <code>{currentQuestion.code_block}</code>
              </pre>
            )}

            <div className="space-y-3">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    answers[currentQuestion.id] === idx
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-secondary border-border hover:border-primary/50'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      answers[currentQuestion.id] === idx
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              {currentIndex === questions.length - 1 && (
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-primary"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}