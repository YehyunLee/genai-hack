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
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
