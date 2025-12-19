import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { Contest } from '@/lib/supabase';
import { 
  Trophy, 
  Clock, 
  Calendar, 
  Users,
  ChevronRight,
  Play,
  Timer,
  CheckCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture, addMinutes } from 'date-fns';

function getContestStatus(contest: Contest): 'upcoming' | 'live' | 'ended' {
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);
  const now = new Date();

  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'live';
  return 'ended';
}

function ContestCard({ contest }: { contest: Contest }) {
  const status = getContestStatus(contest);
  const startTime = new Date(contest.start_time);
  const endTime = addMinutes(startTime, contest.duration_minutes);

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
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const typeColors = {
    daily: 'bg-primary/20 text-primary',
    weekly: 'bg-accent/20 text-accent',
    special: 'bg-glow-warning/20 text-glow-warning',
  };

  return (
    <div className={`group relative p-6 rounded-xl bg-card border transition-all duration-300 ${
      status === 'live' ? 'border-glow-success/50 glow-success' : 'border-border hover:border-primary/50'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={typeColors[contest.contest_type]}>
              {contest.contest_type.charAt(0).toUpperCase() + contest.contest_type.slice(1)}
            </Badge>
            <Badge variant="outline" className={config.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.badge}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {contest.name}
          </h3>
          {contest.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {contest.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(startTime, 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(startTime, 'p')} • {contest.duration_minutes} min</span>
          </div>
          {status === 'upcoming' && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Timer className="h-4 w-4" />
              <span>Starts {formatDistanceToNow(startTime, { addSuffix: true })}</span>
            </div>
          )}
          {status === 'live' && (
            <div className="flex items-center gap-2 text-sm text-glow-success">
              <Timer className="h-4 w-4 animate-pulse" />
              <span>Ends {formatDistanceToNow(endTime, { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Link to={`/contest/${contest.id}`}>
          <Button 
            className="w-full" 
            variant={status === 'live' ? 'default' : 'outline'}
          >
            {status === 'live' ? 'Join Contest' : status === 'upcoming' ? 'View Details' : 'View Results'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Contests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('is_published', true)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setContests((data as Contest[]) || []);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContests = contests.filter((contest) => {
    if (filter === 'all') return true;
    return getContestStatus(contest) === filter;
  });

  const liveContests = contests.filter(c => getContestStatus(c) === 'live');
  const upcomingContests = contests.filter(c => getContestStatus(c) === 'upcoming');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            <Trophy className="inline-block h-8 w-8 text-primary mr-3" />
            Contests
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Join live competitions, test your coding knowledge, and climb the leaderboard.
          </p>
        </div>

        {/* Stats */}
        {(liveContests.length > 0 || upcomingContests.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {liveContests.length > 0 && (
              <div className="p-4 rounded-xl bg-glow-success/10 border border-glow-success/30">
                <div className="flex items-center gap-2 text-glow-success mb-1">
                  <Play className="h-4 w-4" />
                  <span className="text-sm font-medium">Live Now</span>
                </div>
                <p className="text-2xl font-bold">{liveContests.length}</p>
              </div>
            )}
            {upcomingContests.length > 0 && (
              <div className="p-4 rounded-xl bg-glow-warning/10 border border-glow-warning/30">
                <div className="flex items-center gap-2 text-glow-warning mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Upcoming</span>
                </div>
                <p className="text-2xl font-bold">{upcomingContests.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(['all', 'live', 'upcoming', 'ended'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Contest Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredContests.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest) => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No contests found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'Check back soon for new contests!'
                : `No ${filter} contests at the moment.`}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
