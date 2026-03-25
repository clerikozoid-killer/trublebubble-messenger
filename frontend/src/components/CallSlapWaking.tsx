/**
 * Заглушка "робот просыпается": две руки делают пощечины.
 * Используем простую CSS-анимацию без внешних ассетов.
 */
export default function CallSlapWaking() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative w-56 h-56">
        <style>
          {`
            @keyframes slapLeft {
              0%, 55% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
              60% { transform: translate(-48px, 6px) rotate(-32deg); }
              65% { transform: translate(-34px, 2px) rotate(-22deg); }
              75% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
              100% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
            }
            @keyframes slapRight {
              0%, 55% { transform: translate(0, 0) rotate(10deg); opacity: 1; }
              60% { transform: translate(48px, 6px) rotate(32deg); }
              65% { transform: translate(34px, 2px) rotate(22deg); }
              75% { transform: translate(0, 0) rotate(10deg); opacity: 1; }
              100% { transform: translate(0, 0) rotate(10deg); opacity: 1; }
            }
            @keyframes robotBlink {
              0%, 45%, 100% { transform: scaleY(1); }
              48% { transform: scaleY(0.15); }
              52% { transform: scaleY(1); }
            }
          `}
        </style>

        {/* Robot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-2xl bg-background-light border border-background-medium shadow-lg relative">
            <div className="absolute top-8 left-6 w-6 h-6 bg-status-online rounded-full" />
            <div className="absolute top-8 right-6 w-6 h-6 bg-status-online rounded-full" />
            {/* blinking effect */}
            <div
              className="absolute top-8 left-6 w-6 h-6 rounded-full bg-status-online"
              style={{ animation: 'robotBlink 2.4s ease-in-out infinite' }}
            />
            <div
              className="absolute top-8 right-6 w-6 h-6 rounded-full bg-status-online"
              style={{ animation: 'robotBlink 2.4s ease-in-out infinite' }}
            />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-status-online/50" />
            <div className="absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Left hand */}
        <div
          className="absolute bottom-5 left-4 w-14 h-10 rounded-xl bg-background-light border border-background-medium shadow-md origin-bottom-left"
          style={{ animation: 'slapLeft 1.9s ease-in-out infinite' }}
          aria-hidden
        >
          <div className="absolute -left-2 top-7 w-6 h-6 rounded-full bg-background-medium" />
        </div>

        {/* Right hand */}
        <div
          className="absolute bottom-5 right-4 w-14 h-10 rounded-xl bg-background-light border border-background-medium shadow-md origin-bottom-right"
          style={{ animation: 'slapRight 1.9s ease-in-out infinite' }}
          aria-hidden
        >
          <div className="absolute -right-2 top-7 w-6 h-6 rounded-full bg-background-medium" />
        </div>
      </div>

      <div className="text-center text-sm text-text-secondary">
        Backend просыпается. Сейчас будет звонок…
      </div>
    </div>
  );
}

