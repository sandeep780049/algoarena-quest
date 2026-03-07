import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Send,
  RotateCcw,
  Trophy,
} from 'lucide-react';

interface GateQuestion {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  question_text: string;
  code_block: string | null;
  options: string[];
  correct_answer: number;
  explanation: string | null;
}

export default function GatePracticeSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<GateQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const state = location.state as { questionIds?: string[]; subject?: string } | null;
    if (!state?.questionIds || state.questionIds.length === 0) {
      navigate('/gate-practice');
      return;
    }

    const { data } = await supabase
      .from('gate_questions')
      .select('*')
      .in('id', state.questionIds);

    if (data) {
      // Shuffle questions
      const shuffled = (data as GateQuestion[]).sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
    }
    setLoading(false);
  };

  const selectAnswer = (questionId: string, answerIdx: number) => {
    if (submitted) return;
    setAnswers(prev => {
      if (prev[questionId] === answerIdx) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: answerIdx };
    });
  };

  const submitQuiz = async () => {
    if (!user || !sessionId) return;
    setSubmitting(true);

    let correctCount = 0;
    const answerRows: Array<{
      session_id: string;
      question_id: string;
      user_id: string;
      selected_answer: number;
      is_correct: boolean;
    }> = [];

    questions.forEach(q => {
      const selected = answers[q.id];
      if (selected !== undefined) {
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) correctCount++;
        answerRows.push({
          session_id: sessionId,
          question_id: q.id,
          user_id: user.id,
          selected_answer: selected,
          is_correct: isCorrect,
        });
      }
    });

    // Save answers
    if (answerRows.length > 0) {
      await supabase.from('gate_practice_answers').insert(answerRows);
    }

    // Update session
    await supabase
      .from('gate_practice_sessions')
      .update({
        correct_answers: correctCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    setScore(correctCount);
    setSubmitted(true);
    setCurrentIndex(0);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-secondary rounded" />
            <div className="h-64 bg-secondary rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const subjectId = (location.state as any)?.subject;

  // Results view
  if (submitted) {
    return (
      <Layout>
        <SEO title="Practice Results" description="Your practice session results" path={`/gate-practice/session/${sessionId}`} />
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Score Summary */}
          <div className="bg-card border border-border rounded-xl p-8 text-center mb-8">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Practice Complete!</h1>
            <p className="text-5xl font-bold text-primary mb-2">
              {score}/{questions.length}
            </p>
            <p className="text-muted-foreground">
              {Math.round((score / questions.length) * 100)}% accuracy
            </p>
            <Progress value={(score / questions.length) * 100} className="h-2 mt-4 max-w-xs mx-auto" />

            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => navigate(`/gate-practice/${subjectId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Subject
              </Button>
              <Button onClick={() => navigate('/gate-practice')}>
                <RotateCcw className="h-4 w-4 mr-2" />
                More Practice
              </Button>
            </div>
          </div>

          {/* Review Questions */}
          <h2 className="text-xl font-semibold mb-4">Review Answers</h2>
          <div className="space-y-6">
            {questions.map((q, qi) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correct_answer;
              const wasAnswered = userAnswer !== undefined;

              return (
                <div key={q.id} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-sm font-mono text-muted-foreground mt-1">{qi + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {wasAnswered ? (
                          isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Unanswered</span>
                        )}
                        <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                      </div>
                      <p className="font-medium mb-3">{q.question_text}</p>
                      {q.code_block && (
                        <pre className="code-block mb-3 text-sm">{q.code_block}</pre>
                      )}

                      <div className="space-y-2">
                        {(q.options as string[]).map((opt, oi) => {
                          const isUserChoice = userAnswer === oi;
                          const isCorrectOption = q.correct_answer === oi;
                          let className = 'p-3 rounded-lg border text-sm ';
                          if (isCorrectOption) {
                            className += 'border-green-500/50 bg-green-500/10 text-green-300';
                          } else if (isUserChoice && !isCorrectOption) {
                            className += 'border-red-500/50 bg-red-500/10 text-red-300';
                          } else {
                            className += 'border-border text-muted-foreground';
                          }
                          return (
                            <div key={oi} className={className}>
                              <span className="font-mono mr-2">{String.fromCharCode(65 + oi)}.</span>
                              {opt}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">Explanation</p>
                          <p className="text-sm text-muted-foreground">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  // Quiz view
  return (
    <Layout>
      <SEO title="GATE Practice Session" description="Solve GATE practice questions" path={`/gate-practice/session/${sessionId}`} />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answeredCount} answered</span>
          </div>
          <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
        </div>

        {/* Question Navigation Dots */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id] !== undefined
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={`text-xs ${
              currentQ.difficulty === 'easy' ? 'text-green-400 border-green-400/30' :
              currentQ.difficulty === 'hard' ? 'text-red-400 border-red-400/30' :
              'text-yellow-400 border-yellow-400/30'
            }`}>
              {currentQ.difficulty}
            </Badge>
            {currentQ.topic && <Badge variant="outline" className="text-xs">{currentQ.topic}</Badge>}
          </div>

          <p className="text-lg font-medium mb-4">{currentQ.question_text}</p>

          {currentQ.code_block && (
            <pre className="code-block mb-6 text-sm overflow-x-auto">{currentQ.code_block}</pre>
          )}

          <div className="space-y-3">
            {(currentQ.options as string[]).map((opt, oi) => {
              const isSelected = answers[currentQ.id] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => selectAnswer(currentQ.id, oi)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="font-mono text-sm mr-3">{String.fromCharCode(65 + oi)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={submitQuiz} disabled={submitting || answeredCount === 0}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : `Submit (${answeredCount}/${questions.length})`}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
