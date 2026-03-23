import { Outlet, useMatch } from 'react-router-dom';
import clsx from 'clsx';
import ChatSidebar from '../components/ChatSidebar';
import SocketSync from '../components/SocketSync';
import ThemeSync from '../components/ThemeSync';

export default function MessengerLayout() {
  const chatMatch = useMatch('/chat/:chatId');
  const profileMatch = useMatch('/profile/:userId');
  const settingsMatch = useMatch('/settings');
  const savedMatch = useMatch('/saved');
  const showRightPanel = Boolean(chatMatch || profileMatch || settingsMatch || savedMatch);

  return (
    <div className="h-full w-full flex flex-row bg-background-dark min-h-0 min-w-0">
      <SocketSync />
      <ThemeSync />
      <ChatSidebar />
      <div
        className={clsx(
          'flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-background-dark',
          // Home: hide empty state on mobile so the chat list fills the screen; chat/profile always show.
          !showRightPanel && 'max-md:hidden'
        )}
      >
        <Outlet />
      </div>
    </div>
  );
}
