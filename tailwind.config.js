/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          50: '#050505',
          100: '#0B0D10',
          200: '#111318',
        },
        panel: 'rgba(255,255,255,0.04)',
        primary: {
          orange: '#FF8A1F',
          gold: '#D6A64F',
          bronze: '#9A6A35',
        },
        text: {
          primary: '#F7F2E8',
          muted: '#9B9489',
        },
        success: '#49D17D',
        danger: '#D84A32',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 30px rgba(255, 138, 31, 0.15), 0 0 60px rgba(255, 138, 31, 0.08)',
        'glow-amber': '0 0 25px rgba(214, 166, 79, 0.12), 0 0 50px rgba(214, 166, 79, 0.06)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255, 138, 31, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 138, 31, 0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
