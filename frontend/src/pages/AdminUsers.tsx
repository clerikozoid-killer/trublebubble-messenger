import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { BubbleLogo } from '../components/BubbleLogo';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string | null;
      username: string | null;
      displayName: string;
      isAdmin: boolean;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminListUsers();
      setUsers(data);
    } catch {
      setError('Failed to load users or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.adminCreateUser({
        email,
        password,
        displayName,
        username: username || undefined,
        isAdmin: grantAdmin,
      });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setUsername('');
      setGrantAdmin(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-background-light bg-background-medium">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-background-light rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <BubbleLogo variant="icon" size="sm" />
        <h1 className="font-semibold text-text-primary">Admin — users</h1>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-8">
        <form
          onSubmit={handleCreate}
          className="bg-background-medium rounded-2xl p-6 space-y-4 border border-background-light"
        >
          <h2 className="text-lg font-medium text-text-primary">Create account</h2>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background-light rounded-lg text-text-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background-light rounded-lg text-text-primary"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-background-light rounded-lg text-text-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Username (optional)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              className="w-full px-4 py-3 bg-background-light rounded-lg text-text-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={grantAdmin}
              onChange={(e) => setGrantAdmin(e.target.checked)}
              className="rounded"
            />
            Grant admin
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create user'}
          </button>
          {error && <p className="text-status-danger text-sm">{error}</p>}
        </form>

        <div>
          <h2 className="text-lg font-medium text-text-primary mb-3">Accounts</h2>
          {loading ? (
            <p className="text-text-secondary">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex justify-between items-center bg-background-medium rounded-xl px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-text-primary font-medium">{u.displayName}</p>
                    <p className="text-text-secondary">
                      {u.email}
                      {u.username ? ` · @${u.username}` : ''}
                    </p>
                  </div>
                  {u.isAdmin && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      admin
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
