type BubbleLogoProps = {
  variant?: 'icon' | 'wordmark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = { sm: 40, md: 56, lg: 80 };

/** Glossy bubble icon: candy pink, black outline, drip — TrubleBubble brand mark */
export function BubbleLogo({
  variant = 'icon',
  className = '',
  size = 'md',
}: BubbleLogoProps) {
  const px = sizeMap[size];

  if (variant === 'wordmark') {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <BubbleLogo variant="icon" size={size} />
        <span
          className="font-extrabold tracking-tight leading-none text-[#FF5FA8]"
          style={{
            fontFamily: '"Fredoka", system-ui, sans-serif',
            fontSize: size === 'lg' ? '1.75rem' : size === 'md' ? '1.5rem' : '1.25rem',
            textShadow:
              '2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000,2px 2px 0 #000',
          }}
        >
          TrubleBubble
        </span>
      </div>
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="bb-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8EC8" />
          <stop offset="45%" stopColor="#FF5FA8" />
          <stop offset="100%" stopColor="#E0207E" />
        </linearGradient>
        <linearGradient id="bb-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Main bubble */}
      <path
        d="M12 28c0-12 10-20 20-20s20 8 20 20c0 10-8 18-18 20l-2 8-6-6c-8-2-14-10-14-22z"
        fill="url(#bb-pink)"
        stroke="#000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Highlight */}
      <ellipse
        cx="26"
        cy="22"
        rx="8"
        ry="5"
        fill="url(#bb-shine)"
        opacity="0.85"
        transform="rotate(-18 26 22)"
      />
      {/* Drip */}
      <path
        d="M44 46c2 4 2 8-1 10s-6 0-5-4l2-6z"
        fill="#FF5FA8"
        stroke="#000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner smile */}
      <path
        d="M24 36c3 3 8 3 11 0"
        fill="none"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
