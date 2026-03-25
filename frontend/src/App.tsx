import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading...</p>
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

  return (
    <div className="h-full w-full bg-background-dark">
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
