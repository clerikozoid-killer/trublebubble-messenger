import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Phone, Lock, ArrowRight } from 'lucide-react';
import { BubbleLogo } from '../components/BubbleLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.sendCode(phone);
      setStep('code');
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.verifyCode(
        phone,
        code,
        displayName,
        newUserUsername
      );
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/');
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.login(loginIdentifier, password);
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/');
    } catch {
      setError('Invalid email/username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BubbleLogo variant="wordmark" size="lg" />
          </div>
          <p className="text-text-secondary mt-2">Sign in to your account</p>
        </div>

        <div className="bg-background-medium rounded-2xl p-6 shadow-xl">
          {step === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-text-secondary text-sm rounded-lg bg-background-light/80 p-3 border border-background-light">
                <strong className="text-text-primary">Phone (demo):</strong> SMS is not sent — open
                server logs for the code, or use{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => navigate('/register')}
                >
                  email registration
                </button>
                .
              </p>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    Next <ArrowRight className="w-5 h-5 inline" />
                  </span>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-background-light" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background-medium text-text-secondary">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('password')}
                className="w-full py-3 px-4 bg-background-light hover:bg-background-dark text-text-primary font-medium rounded-lg transition-colors"
              >
                Sign in with email or username
              </button>

              {error && (
                <p className="text-status-danger text-sm text-center">{error}</p>
              )}
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary text-center text-2xl tracking-widest font-mono transition-colors"
                  maxLength={6}
                  required
                />
                <p className="text-text-secondary text-xs mt-2 text-center">
                  Code for {phone} — check API response or server log in demo mode
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                />

                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) =>
                    setNewUserUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="Username (optional)"
                  className="w-full px-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    Sign Up / Sign In <ArrowRight className="w-5 h-5 inline" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full py-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Change phone number
              </button>

              {error && (
                <p className="text-status-danger text-sm text-center">{error}</p>
              )}
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Email or username
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="you@example.com or username"
                  className="w-full px-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    Sign In <ArrowRight className="w-5 h-5 inline" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full py-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Sign in with phone number
              </button>

              {error && (
                <p className="text-status-danger text-sm text-center">{error}</p>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-text-secondary text-sm mt-6">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-primary hover:underline"
          >
            Register with email
          </button>
        </p>
      </div>
    </div>
  );
}
