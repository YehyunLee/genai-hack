/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            pre: {
              backgroundColor: 'transparent',
              padding: 0,
              marginTop: '1em',
              marginBottom: '1em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
            code: {
              backgroundColor: 'rgb(31, 41, 55)',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            }
          }
        }
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
