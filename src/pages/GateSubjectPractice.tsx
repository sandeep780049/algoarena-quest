import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getSubjectById, type GateSubject } from '@/lib/gate-subjects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Filter,
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

interface SessionHistory {
  id: string;
  total_questions: number;
  correct_answers: number;
  completed_at: string | null;
  created_at: string;
}

export default function GateSubjectPractice() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState<GateSubject | null>(null);
  const [questions, setQuestions] = useState<GateQuestion[]>([]);
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subjectId) return;
    const s = getSubjectById(subjectId);
    if (!s) { navigate('/gate-practice'); return; }
    setSubject(s);
    // Restore filter
    const saved = localStorage.getItem(`gate-filter-${subjectId}`);
    if (saved) setDifficultyFilter(saved);
    fetchData(subjectId);
  }, [subjectId]);

  // Persist filter
  useEffect(() => {
    if (subjectId) localStorage.setItem(`gate-filter-${subjectId}`, difficultyFilter);
  }, [difficultyFilter, subjectId]);

  const fetchData = async (sid: string) => {
    setLoading(true);
    const { data: qs } = await supabase
      .from('gate_questions')
      .select('*')
      .eq('subject', sid)
      .order('difficulty');

    setQuestions((qs as GateQuestion[]) || []);

    // Load solved from localStorage first (fast)
    const localSolved: string[] = JSON.parse(localStorage.getItem(`gate-solved-${sid}`) || '[]');
    const solvedSet = new Set(localSolved);

    if (user) {
      // Also load from DB
      const { data: answers } = await supabase
        .from('gate_practice_answers')
        .select('question_id')
        .eq('user_id', user.id);

      if (answers) {
        const answeredQIds = [...new Set(answers.map(a => a.question_id))];
        // Filter to only questions in this subject
        const subjectQIds = new Set((qs || []).map((q: any) => q.id));
        answeredQIds.forEach(id => {
          if (subjectQIds.has(id)) solvedSet.add(id);
        });
        // Sync back to localStorage
        localStorage.setItem(`gate-solved-${sid}`, JSON.stringify([...solvedSet]));
      }

      const { data: sess } = await supabase
        .from('gate_practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject', sid)
        .order('created_at', { ascending: false })
        .limit(10);
      setSessions((sess as SessionHistory[]) || []);
    }

    setSolvedIds(solvedSet);
    setLoading(false);
  };

  const startPracticeSession = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!subjectId) return;
    setStartingQuiz(true);

    // Get questions for this subject, filtered by difficulty
    let query = supabase
      .from('gate_questions')
      .select('id')
      .eq('subject', subjectId);

    if (difficultyFilter !== 'all') {
      query = query.eq('difficulty', difficultyFilter);
    }

    const { data: availableQs } = await query;
    if (!availableQs || availableQs.length === 0) {
      setStartingQuiz(false);
      return;
    }

    // Pick random 10 unsolved questions first, then fill with solved if needed
    const unsolved = availableQs.filter(q => !solvedIds.has(q.id));
    const solved = availableQs.filter(q => solvedIds.has(q.id));
    const shuffledUnsolved = unsolved.sort(() => Math.random() - 0.5);
    const shuffledSolved = solved.sort(() => Math.random() - 0.5);
    const selectedIds = [...shuffledUnsolved, ...shuffledSolved].slice(0, 10).map(q => q.id);

    // Create session
    const { data: session, error } = await supabase
      .from('gate_practice_sessions')
      .insert({
        user_id: user.id,
        subject: subjectId,
        total_questions: selectedIds.length,
      })
      .select()
      .single();

    if (error || !session) {
      setStartingQuiz(false);
      return;
    }

    // Navigate to quiz with session and question ids
    navigate(`/gate-practice/session/${session.id}`, {
      state: { questionIds: selectedIds, subject: subjectId },
    });
  };

  const filteredQuestions = difficultyFilter === 'all'
    ? questions
    : questions.filter(q => q.difficulty === difficultyFilter);

  const diffCounts = {
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-secondary rounded" />
            <div className="h-4 w-96 bg-secondary rounded" />
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary rounded-xl" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!subject) return null;
  const Icon = subject.icon;

  return (
    <Layout>
      <SEO title={`${subject.name} - GATE Practice`} description={`Practice ${subject.name} questions for GATE CSE`} path={`/gate-practice/${subjectId}`} />
      <div className="container mx-auto px-4 py-12">
        {/* Back + Header */}
        <Button variant="ghost" onClick={() => navigate('/gate-practice')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Subjects
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{subject.name}</h1>
              <p className="text-muted-foreground">{subject.description}</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={startPracticeSession}
            disabled={filteredQuestions.length === 0 || startingQuiz}
          >
            <Play className="h-5 w-5 mr-2" />
            {startingQuiz ? 'Starting...' : `Start Practice (${Math.min(10, filteredQuestions.length)} Qs)`}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{questions.length}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{diffCounts.easy}</p>
            <p className="text-xs text-muted-foreground">Easy</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{diffCounts.medium}</p>
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{diffCounts.hard}</p>
            <p className="text-xs text-muted-foreground">Hard</p>
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <Button
              key={d}
              size="sm"
              variant={difficultyFilter === d ? 'default' : 'outline'}
              onClick={() => setDifficultyFilter(d)}
              className="capitalize"
            >
              {d === 'all' ? 'All' : d}
            </Button>
          ))}
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Recent Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {s.completed_at ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        {s.correct_answers}/{s.total_questions} correct
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Progress
                    value={s.total_questions > 0 ? (s.correct_answers / s.total_questions) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question List Preview */}
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground text-lg">No questions available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Questions will be added soon!</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Questions ({filteredQuestions.length})
              {solvedIds.size > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  · {filteredQuestions.filter(q => solvedIds.has(q.id)).length} solved
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {filteredQuestions.map((q, i) => {
                const isSolved = solvedIds.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/gate-practice/${subjectId}/${q.id}`)}
                    className={`w-full text-left bg-card border rounded-lg p-4 flex items-center gap-4 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] cursor-pointer ${
                      isSolved ? 'border-primary/30' : 'border-border'
                    }`}
                  >
                    <span className="text-sm font-mono text-muted-foreground w-8 shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${
                          q.difficulty === 'easy' ? 'text-green-400 border-green-400/30' :
                          q.difficulty === 'hard' ? 'text-red-400 border-red-400/30' :
                          'text-yellow-400 border-yellow-400/30'
                        }`}>
                          {q.difficulty}
                        </Badge>
                        {q.topic && <Badge variant="outline" className="text-xs">{q.topic}</Badge>}
                      </div>
                    </div>
                    {isSolved && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
