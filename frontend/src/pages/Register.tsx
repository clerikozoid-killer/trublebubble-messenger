import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import type { User as AppUser } from '../types';
import { User, Lock, Mail, ArrowRight } from 'lucide-react';
import { BubbleLogo } from '../components/BubbleLogo';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.register(
        email.trim(),
        password,
        displayName,
        username || undefined
      );
      setAuth(response.user, response.accessToken, response.refreshToken);
      try {
        const me = await api.get<AppUser>('/users/me');
        setUser(me);
      } catch {
        /* keep user from auth response */
      }
      navigate('/');
    } catch {
      setError('Email or username already taken, or registration failed');
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
          <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
          <p className="text-text-secondary mt-2">Join TrubleBubble with your email</p>
        </div>

        <div className="bg-background-medium rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Username <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                placeholder="johndoe"
                className="w-full px-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
              />
              <p className="text-text-secondary text-xs mt-1">Letters, numbers, underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-3 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  Create Account <ArrowRight className="w-5 h-5 inline" />
                </span>
              )}
            </button>

            {error && <p className="text-status-danger text-sm text-center">{error}</p>}
          </form>
        </div>

        <p className="text-center text-text-secondary text-sm mt-6">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
