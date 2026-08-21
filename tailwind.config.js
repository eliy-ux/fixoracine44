/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09090f',
        panel: '#11111a',
        electric: '#e50914',
        violet: '#8b5cf6',
        mint: '#b7ffdf'
      },
      boxShadow: {
        neon: '0 0 34px rgba(229, 9, 20, .28)',
        violet: '0 0 34px rgba(139, 92, 246, .26)'
      }
    }
  },
  plugins: []
};
