/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          50:  '#06060f',
          100: '#0a0a1a',
          200: '#10101e',
          300: '#16162a',
        },
        primary: {
          orange: '#FF8A1F',
          gold:   '#D6A64F',
          bronze: '#9A6A35',
        },
        text: {
          primary: '#F0EBE0',
          muted:   '#8A8478',
          dim:     '#4A4840',
        },
        success: '#49D17D',
        danger:  '#D84A32',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'neo':         '0 32px 72px rgba(0,0,0,0.65), 0 10px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)',
        'neo-sm':      '0 12px 32px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        'neo-inset':   'inset 4px 4px 12px rgba(0,0,0,0.6), inset -2px -2px 7px rgba(255,255,255,0.03)',
        'neo-raised':  '5px 5px 14px rgba(0,0,0,0.6), -3px -3px 9px rgba(255,255,255,0.035)',
        'glow-orange': '0 0 0 1px rgba(255,138,31,0.25), 0 0 20px rgba(255,138,31,0.25), 0 0 45px rgba(255,138,31,0.10)',
        'glow-gold':   '0 0 0 1px rgba(214,166,79,0.25), 0 0 20px rgba(214,166,79,0.22), 0 0 45px rgba(214,166,79,0.08)',
        'glow-green':  '0 0 0 1px rgba(73,209,125,0.25), 0 0 20px rgba(73,209,125,0.20), 0 0 40px rgba(73,209,125,0.07)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,138,31,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,138,31,0.03) 1px, transparent 1px)',
        'gradient-orange-gold': 'linear-gradient(135deg, #FF8A1F, #D6A64F)',
        'gradient-neo-card':    'linear-gradient(145deg, rgba(20,20,38,0.9), rgba(8,8,16,0.95))',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':    'spin 8s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
