import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { User } from '../types';
import { Lock, ArrowRight } from 'lucide-react';
import { BubbleLogo } from '../components/BubbleLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.login(loginIdentifier, password);
      setAuth(response.user, response.accessToken, response.refreshToken);
      try {
        const me = await api.get<User>('/users/me');
        setUser(me);
      } catch {
        /* keep user from auth response */
      }
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

            {error && <p className="text-status-danger text-sm text-center">{error}</p>}
          </form>
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
