import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GATE_SUBJECTS } from '@/lib/gate-subjects';
import { BookOpen, CheckCircle, ArrowRight, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SubjectStats {
  [subject: string]: {
    totalQuestions: number;
    attempted: number;
    correct: number;
  };
}

export default function GatePractice() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SubjectStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    
    // Get question counts per subject
    const { data: questions } = await supabase
      .from('gate_questions')
      .select('subject');

    const questionCounts: Record<string, number> = {};
    questions?.forEach(q => {
      questionCounts[q.subject] = (questionCounts[q.subject] || 0) + 1;
    });

    // Get user progress if logged in
    let userProgress: Record<string, { attempted: number; correct: number }> = {};
    if (user) {
      const { data: answers } = await supabase
        .from('gate_practice_answers')
        .select('question_id, is_correct')
        .eq('user_id', user.id);

      if (answers) {
        // Get unique questions attempted per subject
        const questionIds = [...new Set(answers.map(a => a.question_id))];
        if (questionIds.length > 0) {
          const { data: answeredQuestions } = await supabase
            .from('gate_questions')
            .select('id, subject')
            .in('id', questionIds);

          answeredQuestions?.forEach(q => {
            if (!userProgress[q.subject]) userProgress[q.subject] = { attempted: 0, correct: 0 };
            userProgress[q.subject].attempted++;
            const correctForQ = answers.some(a => a.question_id === q.id && a.is_correct);
            if (correctForQ) userProgress[q.subject].correct++;
          });
        }
      }
    }

    const newStats: SubjectStats = {};
    GATE_SUBJECTS.forEach(s => {
      newStats[s.id] = {
        totalQuestions: questionCounts[s.id] || 0,
        attempted: userProgress[s.id]?.attempted || 0,
        correct: userProgress[s.id]?.correct || 0,
      };
    });
    setStats(newStats);
    setLoading(false);
  };

  return (
    <Layout>
      <SEO title="GATE Practice - JC AlgoArena" description="Practice subject-wise GATE CSE questions" path="/gate-practice" />
      <div className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">GATE CSE Preparation</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">GATE Practice</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Master Computer Science concepts with subject-wise practice. Choose a topic, solve quiz sets of 10 questions, and track your progress.
          </p>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GATE_SUBJECTS.map((subject) => {
            const stat = stats[subject.id] || { totalQuestions: 0, attempted: 0, correct: 0 };
            const progressPercent = stat.totalQuestions > 0 ? (stat.attempted / stat.totalQuestions) * 100 : 0;
            const Icon = subject.icon;

            return (
              <Link
                key={subject.id}
                to={`/gate-practice/${subject.id}`}
                className="group bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stat.totalQuestions} Qs
                  </Badge>
                </div>

                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                  {subject.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{subject.description}</p>

                {user && stat.totalQuestions > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{stat.attempted} / {stat.totalQuestions} attempted</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>
                )}

                {user && stat.correct > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <CheckCircle className="h-3 w-3 text-primary" />
                    <span>{stat.correct} correct</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <BookOpen className="h-4 w-4" />
                  Start Practice
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
