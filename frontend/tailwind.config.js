/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E91E8C',
          light: '#FF5FA8',
          dark: '#C2186A',
        },
        bubble: {
          pink: '#FF5FA8',
          deep: '#E0207E',
          light: '#FF8EC8',
        },
        background: {
          dark: 'var(--color-bg-dark)',
          medium: 'var(--color-bg-medium)',
          light: 'var(--color-bg-light)',
        },
        chat: {
          incoming: 'var(--color-chat-incoming)',
          outgoing: 'var(--color-chat-outgoing)',
        },
        tg: {
          link: 'var(--color-tg-link)',
          rowActive: 'var(--color-tg-row-active)',
          rowHover: 'var(--color-tg-row-hover)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        status: {
          online: '#34D399',
          offline: '#8E9297',
          danger: '#EF4444',
          warning: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
