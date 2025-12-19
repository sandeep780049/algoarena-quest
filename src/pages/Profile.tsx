import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { ContestResult, Contest } from '@/lib/supabase';
import { 
  User, 
  Trophy, 
  Calendar, 
  Clock,
  ChevronRight,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

interface UserStats {
  totalContests: number;
  totalScore: number;
  avgScore: number;
  bestRank: number | null;
}

export default function Profile() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<(ContestResult & { contest?: Contest })[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalContests: 0,
    totalScore: 0,
    avgScore: 0,
    bestRank: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch results
      const { data: resultsData } = await supabase
        .from('contest_results')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false });

      if (resultsData && resultsData.length > 0) {
        // Fetch contest details
        const contestIds = resultsData.map(r => r.contest_id);
        const { data: contestsData } = await supabase
          .from('contests')
          .select('*')
          .in('id', contestIds);

        const resultsWithContests = resultsData.map(r => ({
          ...r,
          contest: contestsData?.find(c => c.id === r.contest_id) as Contest,
        }));

        setResults(resultsWithContests);

        // Calculate stats
        const totalScore = resultsData.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = totalScore / resultsData.length;

        setStats({
          totalContests: resultsData.length,
          totalScore,
          avgScore: Math.round(avgScore * 10) / 10,
          bestRank: null, // Would need additional query
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-secondary rounded-xl" />
            <div className="h-64 bg-secondary rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{profile.username}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
              </p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalContests}</p>
            <p className="text-sm text-muted-foreground">Contests</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Star className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalScore}</p>
            <p className="text-sm text-muted-foreground">Total Score</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.avgScore}</p>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{results.length > 0 ? results.length : '-'}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
          
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <Link
                  key={result.id}
                  to={`/contest/${result.contest_id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{result.contest?.name || 'Contest'}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.completed_at && format(new Date(result.completed_at), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {result.score}/{result.total_questions}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.time_taken_seconds 
                        ? `${Math.floor(result.time_taken_seconds / 60)}m ${result.time_taken_seconds % 60}s`
                        : '-'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contests completed yet</h3>
              <p className="text-muted-foreground mb-4">
                Join a contest to see your results here!
              </p>
              <Link to="/contests">
                <Button>
                  Browse Contests
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
