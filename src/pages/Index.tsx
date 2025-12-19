import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Terminal, 
  Trophy, 
  Clock, 
  Users, 
  Zap, 
  Code2,
  ChevronRight,
  Star
} from 'lucide-react';

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: Code2,
      title: 'Output-Based Questions',
      description: 'Master your coding logic with carefully crafted output prediction challenges.'
    },
    {
      icon: Trophy,
      title: 'Live Contests',
      description: 'Compete in daily, weekly, and special contests against coders worldwide.'
    },
    {
      icon: Clock,
      title: 'Real-Time Scoring',
      description: 'Instant results and live leaderboards during active competitions.'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join a growing community of passionate programmers.'
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="absolute inset-0 bg-dots opacity-30" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-fade-in">
              <Zap className="h-4 w-4" />
              <span>Level up your coding skills</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-slide-up">
              Welcome to{' '}
              <span className="text-gradient">JC AlgoArena</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              The ultimate coding quiz platform. Test your programming knowledge, 
              compete in live contests, and climb the leaderboard.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {user ? (
                <Link to="/contests">
                  <Button variant="hero" size="xl">
                    <Trophy className="h-5 w-5 mr-2" />
                    Browse Contests
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button variant="hero" size="xl">
                      Get Started Free
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <Link to="/contests">
                    <Button variant="outline" size="xl">
                      View Contests
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">100+</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">Daily</p>
                <p className="text-sm text-muted-foreground">Contests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">Live</p>
                <p className="text-sm text-muted-foreground">Leaderboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="text-primary">AlgoArena</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience competitive programming like never before with our feature-rich platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
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
      <section className="py-20">
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
                Start your journey now!
              </p>
              <Link to={user ? "/contests" : "/auth?mode=signup"}>
                <Button variant="hero" size="xl">
                  <Terminal className="h-5 w-5 mr-2" />
                  {user ? 'Join a Contest' : 'Start Competing'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
