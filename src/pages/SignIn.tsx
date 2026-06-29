import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function SignIn() {
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const { resetPassword } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [from, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotMode) {
      setLoading(true);
      try {
        await resetPassword(email);
        toast.success('Password reset email sent!');
        setForgotMode(false);
      } catch {
        toast.error('Failed to send reset email. Check the address.');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const errMessage = (err as { message?: string })?.message || '';
      const msg = (err as { code?: string })?.code;
      if (msg === 'auth/user-not-found' || msg === 'auth/wrong-password' || msg === 'auth/invalid-credential') {
        toast.error('Invalid email or password.');
      } else if (errMessage.includes('Firebase config missing')) {
        toast.error('Backend is not configured yet. Add VITE_FIREBASE_* env vars and redeploy.');
      } else {
        toast.error('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const errMessage = (err as { message?: string })?.message || '';
      if (errMessage.includes('Firebase config missing')) {
        toast.error('Backend is not configured yet. Add VITE_FIREBASE_* env vars and redeploy.');
      } else {
        toast.error('Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f2f4f8] via-[#e9f1fb] to-[#ffffff]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[#17365f] via-[#1c3d6e] to-[#2a5688] px-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 text-8xl font-bold text-white select-none">ס</div>
          <div className="absolute bottom-32 right-12 text-9xl font-bold text-white select-none">ת</div>
          <div className="absolute top-1/2 left-1/3 text-7xl font-bold text-white select-none">ל</div>
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="h-16 w-16 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">DailySeif</h1>
          <p className="text-[#d9e6f5] text-lg leading-relaxed">
            Learn Torah daily. Quality shiurim, organized and accessible.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['100+', 'Shiurim'], ['5K+', 'Students'], ['Daily', 'Updates']].map(([num, label]) => (
              <div key={label} className="bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{num}</div>
                <div className="text-[#d9e6f5] text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gradient-to-br from-[#17365f] to-[#2a5688] rounded-xl flex items-center justify-center shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">DailySeif</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-[#1c3d6e]/10 border border-[#e1e7ef] p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {forgotMode ? 'Reset Password' : 'Welcome back'}
            </h2>
            <p className="text-[#65758b] mb-8">
              {forgotMode
                ? 'Enter your email to receive a reset link'
                : "Sign in to continue your learning"}
            </p>

            {/* Google */}
            {!forgotMode && (
              <>
                <Button
                  variant="outline"
                  fullWidth
                  loading={googleLoading}
                  onClick={handleGoogle}
                  className="mb-4 border-[#d1dbe8] text-[#1f2937] hover:bg-[#f2f4f8]"
                  leftIcon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  }
                >
                  Continue with Google
                </Button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-[#d1dbe8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3d6e] focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              {!forgotMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 border border-[#d1dbe8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3d6e] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                {!forgotMode && (
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-sm text-[#1c3d6e] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
                {forgotMode && (
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </div>

              <Button type="submit" fullWidth loading={loading} size="lg" className="bg-[#1c3d6e] hover:bg-[#16345e] active:bg-[#122b4d] focus:ring-[#1c3d6e]">
                {forgotMode ? 'Send Reset Link' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#1c3d6e] font-medium hover:underline">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
