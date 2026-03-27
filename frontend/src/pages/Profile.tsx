import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { api } from '../services/api';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Shield,
  MoreVertical,
  Bell,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import type { User as UserType } from '../types';
import { mediaUrl } from '../utils/mediaUrl';
import { useI18n } from '../i18n/useI18n';

const BUBBLE_BOT_USERNAME = 'bubble_bot';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { createChat } = useChatStore();
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const isOwnProfile = userId === currentUser?.id || !userId;
  const isBubbleBot = profile?.username === BUBBLE_BOT_USERNAME;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.id, profile?.avatarUrl]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const targetId = userId || currentUser?.id;
        if (targetId) {
          const data = await api.get<UserType>(`/users/${targetId}`);
          setProfile(data);
        }
      } catch (error) {
        console.error('Fetch profile error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser]);

  const handleStartChat = async () => {
    if (!profile) return;

    try {
      const chat = await createChat('PRIVATE', [profile.id]);
      navigate(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Start chat error:', error);
    }
  };

  const handleCall = () => {
    if (!profile) return;
    if (isBubbleBot) {
      setNotice(t('profile.callUnavailableBot'));
      return;
    }
    setNotice(t('profile.callUnavailableDemo'));
  };

  const handleBlockUser = () => {
    if (!profile) return;
    setShowMenu(false);
    if (isBubbleBot) {
      setNotice(t('profile.blockUnavailableBot'));
      return;
    }
    if (window.confirm(`${t('profile.blockConfirm')} (${profile.displayName})`)) {
      setNotice(t('profile.blockThanks'));
    }
  };

  const handleReportUser = () => {
    if (!profile) return;
    setShowMenu(false);
    if (isBubbleBot) {
      setNotice(t('profile.reportUnavailableBot'));
      return;
    }
    const reason = window.prompt(t('profile.reportPrompt'));
    if (reason === null) return;
    setNotice(t('profile.reportThanks'));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark">
        <p className="text-text-secondary">{t('profile.userNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-background-medium border-b border-background-light">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-background-light rounded-full transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="font-semibold text-text-primary">{t('profile.title')}</h2>
      </div>

      {notice && (
        <div
          className="mx-4 mt-2 px-3 py-2 rounded-lg bg-primary/20 text-sm text-text-primary border border-primary/30 shrink-0"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-primary to-primary-dark" />
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            {mediaUrl(profile.avatarUrl) && !avatarFailed ? (
              <img
                src={mediaUrl(profile.avatarUrl)}
                alt=""
                className="w-32 h-32 rounded-full object-cover border-4 border-background-dark"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center border-4 border-background-dark">
                <span className="text-4xl font-bold text-white">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Online Status */}
          {profile.isOnline && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-6 h-6 bg-status-online rounded-full border-4 border-background-dark" />
          )}
        </div>

        {/* Profile Info */}
        <div className="pt-20 px-4 text-center">
          <h1 className="text-2xl font-bold text-text-primary">{profile.displayName}</h1>
          {profile.username && (
            <p className="text-text-secondary mt-1">@{profile.username}</p>
          )}
          
          <p className="text-sm text-text-secondary mt-2">
            {profile.isOnline
              ? t('profile.online')
              : profile.lastSeenAt
              ? `${t('profile.lastSeen')} ${format(new Date(profile.lastSeenAt), 'MMM d, yyyy HH:mm')}`
              : t('profile.offline')}
          </p>

          {profile.bio && (
            <p className="text-text-primary mt-4 px-4 max-w-md mx-auto">{profile.bio}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6 px-4">
          {!isOwnProfile && (
            <>
              <button
                type="button"
                onClick={handleStartChat}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {t('profile.message')}
              </button>
              <button
                type="button"
                onClick={handleCall}
                className="p-3 bg-background-medium hover:bg-background-light rounded-full transition-colors"
                aria-label={t('profile.call')}
                title={t('profile.call')}
              >
                <Phone className="w-5 h-5 text-text-secondary" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-3 bg-background-medium hover:bg-background-light rounded-full transition-colors relative"
          >
            <MoreVertical className="w-5 h-5 text-text-secondary" />

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-background-light rounded-lg shadow-xl z-20 py-1 animate-scale-in">
                  <button
                    type="button"
                    onClick={handleBlockUser}
                    className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    {t('profile.blockUser')}
                  </button>
                  <button
                    type="button"
                    onClick={handleReportUser}
                    className="w-full px-4 py-2 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    {t('profile.reportUser')}
                  </button>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Info — Telegram-style: value on top, muted label below */}
        <div className="mt-8 mx-4 bg-background-medium rounded-2xl overflow-hidden">
          <div className="divide-y divide-background-light">
            {profile.phone && (
              <div className="p-4 text-center">
                <p className="text-text-primary">{profile.phone}</p>
                <p className="text-xs text-text-secondary mt-1">{t('profile.phone')}</p>
              </div>
            )}

            {profile.username && (
              <div className="p-4 text-center">
                <button
                  type="button"
                  className="text-tg-link hover:underline"
                  onClick={() => navigator.clipboard.writeText(`@${profile.username}`)}
                >
                  @{profile.username}
                </button>
                <p className="text-xs text-text-secondary mt-1">{t('profile.username')}</p>
              </div>
            )}

            <div className="p-4 text-center">
              <p className="text-text-primary">
                {profile.createdAt &&
                  `${t('profile.memberSince')} ${format(new Date(profile.createdAt), 'MMM yyyy')}`}
              </p>
              <p className="text-xs text-text-secondary mt-1">{t('profile.registrationDate')}</p>
            </div>
          </div>
        </div>

        {/* Shared Media */}
        <div className="mt-4 mx-4">
          <h3 className="text-text-secondary text-sm font-medium mb-3">{t('profile.sharedMedia')}</h3>
          <div className="bg-background-medium rounded-2xl p-8 text-center">
            <p className="text-text-secondary">{t('profile.noSharedMedia')}</p>
          </div>
        </div>

        {/* Notifications */}
        {!isOwnProfile && (
          <div className="mt-4 mx-4">
            <h3 className="text-text-secondary text-sm font-medium mb-3">{t('profile.notifications')}</h3>
            <div className="bg-background-medium rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-text-secondary" />
                <span className="text-text-primary">{t('profile.notifications')}</span>
              </div>
              <div className="w-12 h-7 bg-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
