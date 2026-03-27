import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { installDebugUiConsoleApi, installGlobalInteractionLogging } from './utils/debugUi';
import { useLanguageStore } from './stores/languageStore';
import { LANGUAGES } from './i18n/languages';
import Login from './pages/Login';
import Register from './pages/Register';
import MessengerLayout from './layouts/MessengerLayout';
import ChatHome from './pages/ChatHome';
import ChatView from './pages/ChatView';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminUsers from './pages/AdminUsers';
import SavedMessages from './pages/SavedMessages';
import { socket } from './services/socket';
import {
  clearPendingCall,
  savePendingCall,
  setAutoAcceptCallMode,
  type PendingCallPayload,
} from './utils/pendingCall';
import { useI18n } from './i18n/useI18n';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const language = useLanguageStore((s) => s.language);
  const { accessToken } = useAuthStore();
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<PendingCallPayload | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    installDebugUiConsoleApi();
    return installGlobalInteractionLogging();
  }, []);

  useEffect(() => {
    const found = LANGUAGES.find((l) => l.code === language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = found?.htmlLang || 'ru';
    }
  }, [language]);

  useEffect(() => {
    if (!accessToken) return;
    socket.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const onOffer = (p: PendingCallPayload) => {
      // Save so ChatView can pick it up when user opens the chat.
      if (p?.chatId && p?.callId && p?.offer && p?.callType) {
        savePendingCall(p);
        const isInThisChat =
          window.location.pathname === `/chat/${p.chatId}` ||
          window.location.pathname.startsWith(`/chat/${p.chatId}/`);
        if (!isInThisChat) {
          setIncomingCall(p);
        }
      }
    };
    socket.on('call_offer', onOffer);
    return () => socket.off('call_offer', onOffer);
  }, []);

  useEffect(() => {
    if (!globalToast) return;
    const t = window.setTimeout(() => setGlobalToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [globalToast]);

  useEffect(() => {
    // If user navigates into the same chat while modal is open, close modal.
    if (!incomingCall) return;
    const isInThisChat =
      window.location.pathname === `/chat/${incomingCall.chatId}` ||
      window.location.pathname.startsWith(`/chat/${incomingCall.chatId}/`);
    if (isInThisChat) setIncomingCall(null);
  }, [location.pathname, incomingCall]);

  const acceptIncomingFromGlobalModal = () => {
    if (!incomingCall) return;
    setAutoAcceptCallMode(incomingCall.chatId, incomingCall.callId, incomingCall.callType);
    setIncomingCall(null);
    navigate(`/chat/${incomingCall.chatId}`);
  };

  const rejectIncomingFromGlobalModal = () => {
    if (!incomingCall) return;
    try {
      if (socket.connected) {
        socket.emit('call_rejected', {
          chatId: incomingCall.chatId,
          callId: incomingCall.callId,
          reason: 'rejected',
        });
      }
    } finally {
      clearPendingCall(incomingCall.chatId);
      setIncomingCall(null);
    }
  };

  return (
    <div className="h-full w-full bg-background-dark">
      {globalToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] px-4 py-2.5 bg-background-light rounded-xl shadow-xl text-sm text-text-primary border border-background-medium max-w-[90vw] text-center"
          role="status"
        >
          {globalToast}
        </div>
      )}
      {incomingCall && (
        <div className="fixed inset-0 z-[260] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background-light border border-background-medium rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-medium/70">
              <div className="text-sm font-semibold text-text-primary">
                {incomingCall.callType === 'video'
                  ? t('call.ui.incomingVideoCall')
                  : t('call.ui.incomingVoiceCall')}
              </div>
              <button
                type="button"
                className="p-2 hover:bg-background-light rounded-full transition-colors"
                aria-label={t('call.ui.closeCall')}
                onClick={rejectIncomingFromGlobalModal}
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-4">
              <div className="w-full h-48 rounded-lg bg-background-dark/60 border border-background-medium/60 flex flex-col items-center justify-center text-text-secondary gap-3">
                {/* Cat placeholder for incoming call connection screen */}
                <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path
                    d="M16 22c0-9 6-14 16-14s16 5 16 14v8c0 14-7 24-16 24S16 44 16 30v-8Z"
                    fill="#FF2B5E"
                    fillOpacity="0.18"
                  />
                  <path
                    d="M18 18 9 26c-2 2-2 6 0 8l5 5"
                    stroke="#FF2B5E"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M46 18 55 26c2 2 2 6 0 8l-5 5"
                    stroke="#FF2B5E"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24 27c0-3 3-6 8-6s8 3 8 6"
                    stroke="#FF2B5E"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="26.5" cy="34" r="3.8" fill="#FF2B5E" />
                  <circle cx="43.5" cy="34" r="3.8" fill="#FF2B5E" />
                  <path
                    d="M32 36c-4 2-6 6-6 8 0 3 3 5 6 5s6-2 6-5c0-2-2-6-6-8Z"
                    fill="#FF2B5E"
                    fillOpacity="0.28"
                  />
                  <path
                    d="M28 44c1.5 2 3 3 4 3s2.5-1 4-3"
                    stroke="#FF2B5E"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-sm">
                  {incomingCall.callType === 'video'
                    ? t('call.ui.connectingVideoCall')
                    : t('call.ui.connectingVoiceCall')}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-background-medium/70 flex flex-col gap-2">
              {incomingCall.callType === 'video' ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-95 transition-opacity"
                      onClick={() => {
                        setAutoAcceptCallMode(incomingCall.chatId, incomingCall.callId, 'video');
                        setIncomingCall(null);
                        navigate(`/chat/${incomingCall.chatId}`);
                      }}
                    >
                      {t('call.acceptVideo')}
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors"
                      onClick={() => {
                        // Best-effort audio-only: try to answer with audio mode.
                        setAutoAcceptCallMode(incomingCall.chatId, incomingCall.callId, 'audio');
                        setIncomingCall(null);
                        navigate(`/chat/${incomingCall.chatId}`);
                      }}
                    >
                      {t('call.acceptAudioOnly')}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-full px-4 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors"
                    onClick={rejectIncomingFromGlobalModal}
                  >
                    {t('call.reject')}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-95 transition-opacity"
                    onClick={acceptIncomingFromGlobalModal}
                  >
                    {t('call.accept')}
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors"
                    onClick={rejectIncomingFromGlobalModal}
                  >
                    {t('call.reject')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MessengerLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<ChatHome />} />
          <Route path="chat/:chatId" element={<ChatView />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="saved" element={<SavedMessages />} />
        </Route>
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
