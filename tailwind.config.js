/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary, #FFFFFF)',
          secondary: 'var(--color-bg-secondary, #F8F9FA)',
          tertiary: 'var(--color-bg-tertiary, #F0F2F5)',
        },
        text: {
          primary: 'var(--color-text-primary, #1A1A1A)',
          secondary: 'var(--color-text-secondary, #666666)',
          muted: 'var(--color-text-muted, #9CA3AF)',
        },
        brand: {
          DEFAULT: 'var(--color-brand-500, #0066CC)',
          50: 'var(--color-brand-50, #E6F0FA)',
          100: 'var(--color-brand-100, #CCE0F5)',
          500: 'var(--color-brand-500, #0066CC)',
          600: 'var(--color-brand-600, #0052A3)',
          700: 'var(--color-brand-700, #003D7A)',
        },
        success: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
        neutral: '#6C757D',
        divider: 'var(--color-divider, rgba(229, 231, 235, 0.5))',
        border: 'var(--color-border, #E5E7EB)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['"Fira Code"', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card, 0 4px 20px -2px rgba(0, 0, 0, 0.05))',
        'card-hover': 'var(--shadow-card-hover, 0 12px 32px -4px rgba(0, 0, 0, 0.1))',
      },
    },
  },
  plugins: [],
}
