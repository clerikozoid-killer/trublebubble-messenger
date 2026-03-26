import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { api } from '../services/api';
import { socket } from '../services/socket';
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Users,
  Hash,
  ChevronRight,
  HelpCircle,
  Shield,
  Camera,
} from 'lucide-react';
import type { User as UserType } from '../types';
import { mediaUrl } from '../utils/mediaUrl';
import { useAppearanceStore } from '../stores/appearanceStore';
import { useSoundSettingsStore } from '../stores/soundSettingsStore';
import { playIncomingMessageSound, unlockNotificationAudio } from '../utils/messageNotificationSound';
import { useI18n } from '../i18n/useI18n';
import { LANGUAGES, type LangCode } from '../i18n/languages';
import { useLanguageStore } from '../stores/languageStore';

const profileFormClass =
  'w-full max-w-md mx-auto px-4 py-6 space-y-5';

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, setUser, logout } = useAuthStore();
  const appearance = useAppearanceStore((s) => s.appearance);
  const setAppearance = useAppearanceStore((s) => s.setAppearance);
  const { t } = useI18n();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createChat: _createChat } = useChatStore();
  /** `menu` = список разделов (в т.ч. Administration для админов); раньше по умолчанию был `profile`, из‑за этого меню не показывалось. */
  const [activeTab, setActiveTab] = useState<
    | 'menu'
    | 'profile'
    | 'appearance'
    | 'privacy'
    | 'notifications'
    | 'language'
    | 'create-group'
    | 'create-channel'
  >('menu');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const soundEnabled = useSoundSettingsStore((s) => s.enabled);
  const soundVolume = useSoundSettingsStore((s) => s.volume);
  const setSoundEnabled = useSoundSettingsStore((s) => s.setEnabled);
  const setSoundVolume = useSoundSettingsStore((s) => s.setVolume);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setBio(user.bio || '');
    setUsername(user.username || '');
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create-group' || tab === 'create-channel') {
      setActiveTab(tab);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarUploading(true);
    setSaveError(null);
    try {
      const updated = await api.uploadAvatar(file);
      setUser(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updatedUser = await api.patch<UserType>('/users/me', {
        displayName: displayName.trim(),
        bio: bio.slice(0, 70),
        username: username.trim() === '' ? null : username,
      });
      setUser(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    socket.disconnect();
    navigate('/login');
  };

  const handleCreateGroup = () => {
    setActiveTab('create-group');
  };

  const settingsGroups = [
    {
      title: t('settings.menu.account'),
      items: [
        {
          icon: User,
          label: t('settings.menu.editProfile'),
          action: () => setActiveTab('profile'),
        },
        {
          icon: Lock,
          label: t('settings.menu.privacySecurity'),
          action: () => setActiveTab('privacy'),
        },
      ],
    },
    ...(user?.isAdmin
      ? [
          {
            title: t('settings.menu.administration'),
            items: [
              {
                icon: Shield,
                label: t('settings.menu.createManageUsers'),
                action: () => navigate('/admin/users'),
              },
            ],
          },
        ]
      : []),
    {
      title: t('settings.menu.chats'),
      items: [
        { icon: Users, label: t('settings.menu.createGroup'), action: handleCreateGroup },
        { icon: Hash, label: t('settings.menu.createChannel'), action: () => setActiveTab('create-channel') },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Bell, label: t('settings.menu.notifications'), action: () => setActiveTab('notifications') },
        { icon: Palette, label: t('settings.menu.appearance'), action: () => setActiveTab('appearance') },
        { icon: Globe, label: t('settings.menu.language'), action: () => setActiveTab('language') },
      ],
    },
    {
      title: t('settings.menu.help'),
      items: [{ icon: HelpCircle, label: t('settings.menu.help'), action: () => {} }],
    },
  ];

  return (
    <div className="h-full flex flex-col bg-background-dark" data-testid="settings-page">
      <div className="flex items-center gap-3 p-4 bg-background-medium border-b border-background-light shrink-0">
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'menu') navigate(-1);
            else setActiveTab('menu');
          }}
          className="p-2 hover:bg-background-light rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="font-semibold text-text-primary">
          {activeTab === 'profile'
            ? t('settings.tab.editProfile')
            : activeTab === 'appearance'
              ? t('settings.tab.appearance')
              : t('settings.tab.settings')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'menu' ? (
          <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-6">
            {settingsGroups.map((group, index) => (
              <div key={index}>
                <h3 className="text-text-secondary text-xs font-medium uppercase mb-2 px-2">
                  {group.title}
                </h3>
                <div className="bg-background-medium rounded-2xl overflow-hidden divide-y divide-background-light border border-background-light/50">
                  {group.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      type="button"
                      onClick={item.action}
                      className="w-full p-4 flex items-center gap-4 hover:bg-background-light transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="flex-1 text-text-primary">{item.label}</span>
                      <ChevronRight className="w-5 h-5 text-text-secondary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full p-4 flex items-center gap-4 bg-background-medium rounded-2xl hover:bg-background-light transition-colors text-left border border-background-light/50"
              >
                <div className="w-10 h-10 rounded-full bg-status-danger/20 flex items-center justify-center">
                  <span className="text-xl">🚪</span>
                </div>
              <span className="text-status-danger">{t('settings.logout')}</span>
              </button>
            </div>

          <p className="text-center text-text-secondary text-sm pb-4">{t('settings.title.trublebubble')}</p>
          </div>
        ) : activeTab === 'profile' ? (
          <>
            <div className="border-b border-background-light">
              <div className={profileFormClass}>
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    data-testid="avatar-input"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative mx-auto block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                    data-testid="avatar-button"
                  >
                    {mediaUrl(user?.avatarUrl) ? (
                      <img
                        src={mediaUrl(user?.avatarUrl)}
                        alt=""
                        className="w-24 h-24 rounded-full object-cover ring-2 ring-background-light"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center ring-2 ring-background-light">
                        <span className="text-3xl font-bold text-white">
                          {user?.displayName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center ring-2 ring-background-dark shadow-md">
                      {avatarUploading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" aria-hidden />
                      )}
                    </span>
                  </button>
                  <p className="text-text-secondary text-sm mt-3">
                    Tap the photo to upload (JPEG, PNG, GIF, WebP — max 2 MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2" htmlFor="displayName">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-colors"
                    data-testid="settings-display-name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary focus:ring-1 focus:ring-primary text-text-primary transition-colors"
                    data-testid="settings-username"
                  />
                  <p className="text-text-secondary text-xs mt-1">
                    @{username || 'username'} — public username in TrubleBubble
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2" htmlFor="bio">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 70))}
                    placeholder="Write something about yourself..."
                    rows={3}
                    className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary focus:ring-1 focus:ring-primary text-text-primary placeholder-text-secondary resize-none transition-colors"
                    data-testid="settings-bio"
                  />
                  <p className="text-text-secondary text-xs mt-1 text-right">{bio.length}/70</p>
                </div>

                {saveError && (
                  <p className="text-status-danger text-sm text-center" role="alert">
                    {saveError}
                  </p>
                )}
                {saveSuccess && (
                  <p className="text-status-online text-sm text-center" data-testid="save-success">
                    Profile saved
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  data-testid="save-profile"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'appearance' ? (
          <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h2 className="text-xl font-semibold text-text-primary">Appearance</h2>
            <p className="text-sm text-text-secondary">
              Theme: dark, light, or follow the system setting.
            </p>
            <div className="flex flex-col gap-2">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAppearance(t)}
                  className={`p-4 rounded-xl text-left border transition-colors ${
                    appearance === t
                      ? 'border-tg-link bg-background-medium ring-1 ring-tg-link/30'
                      : 'border-background-light hover:bg-background-light'
                  }`}
                >
                  <span className="text-text-primary font-medium capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>
        ) : activeTab === 'create-group' ? (
          <CreateGroup onBack={() => setActiveTab('menu')} />
        ) : activeTab === 'create-channel' ? (
          <CreateChannel onBack={() => setActiveTab('menu')} />
        ) : activeTab === 'privacy' ||
          activeTab === 'notifications' ||
          activeTab === 'language' ? (
          <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h2 className="text-xl font-semibold text-text-primary">
              {activeTab === 'privacy' && 'Privacy & Security'}
              {activeTab === 'notifications' && 'Notifications'}
          {activeTab === 'language' && t('settings.language.title')}
            </h2>
            {activeTab === 'notifications' ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text-primary">Sounds</h3>
                <p className="text-sm text-text-secondary">
                  Проигрывать случайные звуки при входящих сообщениях (выстрел / попадание / «Эй!»).
                </p>

                <div className="flex items-center justify-between gap-4 bg-background-medium p-4 rounded-xl border border-background-light/50">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Включить звуки</p>
                    <p className="text-xs text-text-secondary mt-1">Можно отключить в любой момент.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEnabled}
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      if (next) unlockNotificationAudio();
                    }}
                    className={
                      soundEnabled
                        ? 'inline-flex h-8 w-14 items-center rounded-full bg-tg-link justify-end px-1 transition-colors'
                        : 'inline-flex h-8 w-14 items-center rounded-full bg-background-light justify-start px-1 transition-colors'
                    }
                  >
                    <span className="h-6 w-6 rounded-full bg-white shadow shrink-0" />
                  </button>
                </div>

                <div className="bg-background-medium p-4 rounded-xl border border-background-light/50 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Громкость</p>
                    <p className="text-xs text-text-secondary">{Math.round(soundVolume * 100)}%</p>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={soundVolume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSoundVolume(v);
                    }}
                    className="w-full accent-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        unlockNotificationAudio();
                        void playIncomingMessageSound(soundVolume);
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition-colors"
                    >
                      Test sound
                    </button>
                  </div>
                </div>

                <p className="text-xs text-text-secondary">
                  Совет: скачай MP3/WAV (например из разделов «пули»), положи в <span className="font-mono">frontend/public/sounds</span> как <span className="font-mono">hey.mp3</span>, <span className="font-mono">shot.mp3</span>, <span className="font-mono">hit.mp3</span>.
                </p>
              </div>
            ) : activeTab === 'language' ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text-primary">{t('settings.language.title')}</h3>
                <p className="text-sm text-text-secondary">{t('settings.language.select')}</p>

                <div className="flex flex-col gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code as LangCode)}
                      className={`w-full p-4 rounded-xl text-left border transition-colors ${
                        language === l.code
                          ? 'border-tg-link bg-background-medium ring-1 ring-tg-link/30'
                          : 'border-background-light hover:bg-background-light'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-text-primary font-medium">{l.label}</span>
                        {language === l.code && (
                          <span className="text-text-secondary text-sm">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No extra options here yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateGroup({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { createChat } = useChatStore();
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const chat = await createChat('GROUP', [], title, username || undefined);
      onBack();
      navigate(`/chat/${chat.id}`, { replace: true });
    } catch {
      setError('Could not create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4" data-testid="create-group-panel">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <h2 className="text-xl font-semibold text-text-primary">Create group</h2>

      <div>
        <label className="block text-sm text-text-secondary mb-2" htmlFor="group-title">
          Group name
        </label>
        <input
          id="group-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter group name"
          className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
          data-testid="group-title-input"
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2" htmlFor="group-username">
          Group username (optional)
        </label>
        <input
          id="group-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="unique_username"
          className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
          data-testid="group-username-input"
        />
      </div>

      {error && <p className="text-status-danger text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleCreate}
        disabled={!title.trim() || isCreating}
        className="w-full py-3 px-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        data-testid="create-group-submit"
      >
        {isCreating ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Create group'
        )}
      </button>
    </div>
  );
}

function CreateChannel({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { createChat } = useChatStore();
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const chat = await createChat('CHANNEL', [], title, username || undefined);
      onBack();
      navigate(`/chat/${chat.id}`, { replace: true });
    } catch {
      setError('Could not create channel');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4" data-testid="create-channel-panel">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <h2 className="text-xl font-semibold text-text-primary">Create channel</h2>

      <div>
        <label className="block text-sm text-text-secondary mb-2" htmlFor="channel-title">
          Channel name
        </label>
        <input
          id="channel-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter channel name"
          className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2" htmlFor="channel-username">
          Channel username (optional)
        </label>
        <input
          id="channel-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="unique_username"
          className="w-full px-4 py-3 bg-background-medium rounded-xl border border-background-light focus:border-primary text-text-primary placeholder-text-secondary transition-colors"
        />
      </div>

      {error && <p className="text-status-danger text-sm">{error}</p>}

      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={!title.trim() || isCreating}
        className="w-full py-3 px-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isCreating ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Create channel'
        )}
      </button>
    </div>
  );
}
