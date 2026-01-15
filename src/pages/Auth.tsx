import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Terminal, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Password must have: 1 uppercase, 1 lowercase, 1 digit, 1 symbol, min 6 chars
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').regex(
    passwordRegex,
    'Password must have 1 uppercase, 1 lowercase, 1 digit, and 1 symbol'
  ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthView = 'signin' | 'signup' | 'forgot-password';

export default function Auth() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialModeFromPath = location.pathname === '/auth/signup' ? 'signup' : location.pathname === '/auth/reset' ? 'reset' : null;
  const initialMode = initialModeFromPath ?? searchParams.get('mode');

  const [view, setView] = useState<AuthView>(initialMode === 'signup' ? 'signup' : initialMode === 'reset' ? 'forgot-password' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSignUp = view === 'signup';

  useEffect(() => {
    if (user) {
      const redirectUrl = sessionStorage.getItem('redirectAfterAuth');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectUrl);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const validateForm = () => {
    setErrors({});
    
    try {
      if (isSignUp) {
        signUpSchema.parse({ email, password, confirmPassword, username });
      } else {
        signInSchema.parse({ email, password });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const checkUsernameExists = async (usernameToCheck: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameToCheck)
      .maybeSingle();
    
    return !!data;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }

    try {
      z.string().email().parse(email);
    } catch {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });

      if (error) {
        toast({
          title: 'Password reset failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link. Please check your inbox.',
        });
        setView('signin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isSignUp) {
        // Check if username already exists
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
          setErrors({ username: 'Username already taken. Please choose another.' });
          toast({
            title: 'Username taken',
            description: 'This username is already in use. Please choose a different one.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Create the account directly
        const { error: signUpError } = await signUp(email, password, username);
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
            setView('signin');
          } else {
            toast({
              title: 'Sign up failed',
              description: signUpError.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome to AlgoArena!',
            description: 'Your account has been created successfully.',
          });
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          // Store remember me preference
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
            sessionStorage.setItem('sessionOnly', 'true');
          }
          toast({
            title: 'Welcome back!',
            description: 'You have signed in successfully.',
          });
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPassword = () => (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Terminal className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">
            <span className="text-primary">JC</span> AlgoArena
          </span>
        </div>
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground mt-2">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setView('signin')}
          className="text-primary hover:underline font-medium text-sm"
        >
          Back to sign in
        </button>
      </div>
    </>
  );

  const renderMainAuth = () => (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Terminal className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">
            <span className="text-primary">JC</span> AlgoArena
          </span>
        </div>
        <h1 className="text-2xl font-bold">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isSignUp 
            ? 'Start your competitive coding journey' 
            : 'Sign in to continue competing'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="coder123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              Min 6 characters: 1 UPPERCASE + 1 lowercase + 1 digit + 1 symbol (!@#$%...)
            </p>
          )}
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        {!isSignUp && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="rememberMe" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label 
              htmlFor="rememberMe" 
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
        )}

        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </Button>
      </form>

      {/* Toggle */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setView(isSignUp ? 'signin' : 'signup')}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-hero-gradient opacity-30" />
      
      <div className="w-full max-w-md relative">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {view === 'forgot-password' && renderForgotPassword()}
          {(view === 'signin' || view === 'signup') && renderMainAuth()}
        </div>
      </div>
    </div>
  );
}
