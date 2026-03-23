import { BubbleLogo } from '../components/BubbleLogo';

/** Right pane when no chat is selected (desktop). Hidden on mobile — list fills the screen. */
export default function ChatHome() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background-dark min-h-0 min-w-0">
      <div className="text-center px-6">
        <div className="w-24 h-24 rounded-full bg-background-medium flex items-center justify-center mx-auto mb-6">
          <BubbleLogo variant="icon" size="lg" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">TrubleBubble</h2>
        <p className="text-text-secondary max-w-xs">
          Select a chat to start messaging or create a new conversation
        </p>
      </div>
    </div>
  );
}
