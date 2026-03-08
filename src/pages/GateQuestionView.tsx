import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getSubjectById } from '@/lib/gate-subjects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
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

export default function GateQuestionView() {
  const { subjectId, questionId } = useParams<{ subjectId: string; questionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState<GateQuestion | null>(null);
  const [allIds, setAllIds] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const subject = subjectId ? getSubjectById(subjectId) : null;

  useEffect(() => {
    if (!subjectId || !questionId) return;
    loadQuestion();
  }, [subjectId, questionId]);

  const loadQuestion = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setRevealed(false);

    // Load the specific question
    const { data: q } = await supabase
      .from('gate_questions')
      .select('*')
      .eq('id', questionId!)
      .single();

    if (!q) {
      navigate(`/gate-practice/${subjectId}`);
      return;
    }
    setQuestion(q as GateQuestion);

    // Load all question IDs for this subject (for prev/next nav)
    // Use stored filter from localStorage
    const storedFilter = localStorage.getItem(`gate-filter-${subjectId}`) || 'all';
    let query = supabase
      .from('gate_questions')
      .select('id')
      .eq('subject', subjectId!)
      .order('difficulty');

    if (storedFilter !== 'all') {
      query = query.eq('difficulty', storedFilter);
    }

    const { data: ids } = await query;
    setAllIds((ids || []).map(i => i.id));

    // Check if already answered
    if (user) {
      const { data: existing } = await supabase
        .from('gate_practice_answers')
        .select('selected_answer, is_correct')
        .eq('user_id', user.id)
        .eq('question_id', questionId!)
        .limit(1);

      if (existing && existing.length > 0) {
        setSelectedAnswer(existing[0].selected_answer);
        setRevealed(true);
      }
    }

    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || !question || !user) return;
    setSaving(true);

    const isCorrect = selectedAnswer === question.correct_answer;

    // We need a session_id - create a lightweight one or use a placeholder
    // First check if user has an active session for this subject
    let sessionId: string;
    const { data: existingSession } = await supabase
      .from('gate_practice_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject', subjectId!)
      .is('completed_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingSession && existingSession.length > 0) {
      sessionId = existingSession[0].id;
    } else {
      const { data: newSession } = await supabase
        .from('gate_practice_sessions')
        .insert({ user_id: user.id, subject: subjectId!, total_questions: 1 })
        .select()
        .single();
      sessionId = newSession!.id;
    }

    await supabase.from('gate_practice_answers').insert({
      session_id: sessionId,
      question_id: question.id,
      user_id: user.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
    });

    // Mark solved in localStorage for fast UI
    const solvedKey = `gate-solved-${subjectId}`;
    const solved: string[] = JSON.parse(localStorage.getItem(solvedKey) || '[]');
    if (!solved.includes(question.id)) {
      solved.push(question.id);
      localStorage.setItem(solvedKey, JSON.stringify(solved));
    }

    setRevealed(true);
    setSaving(false);
  };

  const currentIdx = allIds.indexOf(questionId!);
  const prevId = currentIdx > 0 ? allIds[currentIdx - 1] : null;
  const nextId = currentIdx < allIds.length - 1 ? allIds[currentIdx + 1] : null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
            <div className="h-8 w-64 bg-secondary rounded" />
            <div className="h-64 bg-secondary rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!question || !subject) return null;

  const isCorrect = selectedAnswer === question.correct_answer;

  return (
    <Layout>
      <SEO
        title={`Q${currentIdx + 1} - ${subject.name} Practice`}
        description={question.question_text.slice(0, 150)}
        path={`/gate-practice/${subjectId}/${questionId}`}
      />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/gate-practice/${subjectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {subject.shortName}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIdx >= 0 ? `${currentIdx + 1} / ${allIds.length}` : ''}
          </span>
        </div>

        {/* Question Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={`text-xs ${
              question.difficulty === 'easy' ? 'text-green-400 border-green-400/30' :
              question.difficulty === 'hard' ? 'text-red-400 border-red-400/30' :
              'text-yellow-400 border-yellow-400/30'
            }`}>
              {question.difficulty}
            </Badge>
            {question.topic && <Badge variant="outline" className="text-xs">{question.topic}</Badge>}
            {revealed && (
              <div className="ml-auto flex items-center gap-1">
                {isCorrect ? (
                  <><CheckCircle className="h-4 w-4 text-green-400" /><span className="text-xs text-green-400">Correct</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-400" /><span className="text-xs text-red-400">Incorrect</span></>
                )}
              </div>
            )}
          </div>

          <p className="text-lg font-medium mb-4">{question.question_text}</p>

          {question.code_block && (
            <pre className="code-block mb-6 text-sm overflow-x-auto">{question.code_block}</pre>
          )}

          <div className="space-y-3">
            {(question.options as string[]).map((opt, oi) => {
              const isSelected = selectedAnswer === oi;
              const isCorrectOpt = question.correct_answer === oi;

              let cls = 'w-full text-left p-4 rounded-lg border transition-all ';
              if (revealed) {
                if (isCorrectOpt) {
                  cls += 'border-green-500/50 bg-green-500/10 text-green-300';
                } else if (isSelected && !isCorrectOpt) {
                  cls += 'border-red-500/50 bg-red-500/10 text-red-300';
                } else {
                  cls += 'border-border text-muted-foreground';
                }
              } else {
                cls += isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground cursor-pointer';
              }

              return (
                <button
                  key={oi}
                  onClick={() => !revealed && setSelectedAnswer(oi)}
                  disabled={revealed}
                  className={cls}
                >
                  <span className="font-mono text-sm mr-3">{String.fromCharCode(65 + oi)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Submit / Explanation */}
          {!revealed && user && (
            <Button
              className="mt-6 w-full"
              disabled={selectedAnswer === null || saving}
              onClick={handleSubmitAnswer}
            >
              {saving ? 'Submitting...' : 'Submit Answer'}
            </Button>
          )}

          {!revealed && !user && (
            <Button className="mt-6 w-full" onClick={() => navigate('/auth')}>
              Login to Submit Answer
            </Button>
          )}

          {revealed && question.explanation && (
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">Explanation</p>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Prev / Next Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={!prevId}
            onClick={() => prevId && navigate(`/gate-practice/${subjectId}/${prevId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!nextId}
            onClick={() => nextId && navigate(`/gate-practice/${subjectId}/${nextId}`)}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
