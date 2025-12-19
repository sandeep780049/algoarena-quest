import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Contest, Question } from '@/lib/supabase';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Timer,
  Flag,
  Send
} from 'lucide-react';
import { addMinutes, differenceInSeconds } from 'date-fns';

export default function Quiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (id) {
      fetchQuizData();
    }
  }, [id, user]);

  useEffect(() => {
    if (!contest || !startedAt) return;
    
    const endTime = addMinutes(new Date(contest.start_time), contest.duration_minutes);
    
    const updateTimer = () => {
      const now = new Date();
      const diff = differenceInSeconds(endTime, now);
      
      if (diff <= 0) {
        handleSubmit();
        return;
      }
      
      setTimeRemaining(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contest, startedAt]);

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
          .select('id, question_text, code_block, options')
          .in('id', questionIds);
        
        if (questionsData) {
          const sortedQuestions = questionIds.map(qid => 
            questionsData.find(q => q.id === qid)
          ).filter(Boolean) as Question[];
          setQuestions(sortedQuestions);
        }
      }

      // Load existing answers
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

        // Get start time
        const { data: resultData } = await supabase
          .from('contest_results')
          .select('started_at')
          .eq('contest_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (resultData?.started_at) {
          setStartedAt(new Date(resultData.started_at));
        } else {
          setStartedAt(new Date());
        }
      }
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

  const saveAnswer = async (questionId: string, answerIndex: number) => {
    if (!user || !contest) return;

    // Get correct answer
    const { data: questionData } = await supabase
      .from('questions')
      .select('correct_answer')
      .eq('id', questionId)
      .maybeSingle();

    const isCorrect = questionData?.correct_answer === answerIndex;

    try {
      await supabase
        .from('submissions')
        .upsert({
          user_id: user.id,
          contest_id: contest.id,
          question_id: questionId,
          selected_answer: answerIndex,
          is_correct: isCorrect,
        });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const selectAnswer = (answerIndex: number) => {
    const question = questions[currentIndex];
    if (!question) return;

    setAnswers(prev => ({
      ...prev,
      [question.id]: answerIndex,
    }));

    saveAnswer(question.id, answerIndex);
  };

  const handleSubmit = useCallback(async () => {
    if (!user || !contest || submitting) return;
    
    setSubmitting(true);

    try {
      // Calculate score
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('is_correct')
        .eq('contest_id', contest.id)
        .eq('user_id', user.id);

      const score = submissionsData?.filter(s => s.is_correct).length || 0;
      const timeTaken = startedAt 
        ? Math.floor((new Date().getTime() - startedAt.getTime()) / 1000)
        : 0;

      // Update result
      await supabase
        .from('contest_results')
        .upsert({
          user_id: user.id,
          contest_id: contest.id,
          score,
          total_questions: questions.length,
          time_taken_seconds: timeTaken,
          completed_at: new Date().toISOString(),
        });

      toast({
        title: 'Quiz submitted!',
        description: `You scored ${score} out of ${questions.length}`,
      });

      navigate(`/contest/${contest.id}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, contest, submitting, startedAt, questions.length, toast, navigate]);

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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Question Navigator */}
        <div className="flex flex-wrap gap-2 mb-8">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                idx === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id] !== undefined
                  ? 'bg-glow-success/20 text-glow-success border border-glow-success/30'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Question Card */}
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">Question {currentIndex + 1}</Badge>
          </div>

          <h2 className="text-xl font-semibold mb-6">{currentQuestion.question_text}</h2>

          {/* Code Block */}
          {currentQuestion.code_block && (
            <div className="code-block mb-6">
              <pre className="whitespace-pre-wrap">
                <code>{currentQuestion.code_block}</code>
              </pre>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  answers[currentQuestion.id] === idx
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-secondary/50 border-border hover:border-primary/50 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    answers[currentQuestion.id] === idx
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="font-mono">{option}</span>
                </div>
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

          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Flag className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
