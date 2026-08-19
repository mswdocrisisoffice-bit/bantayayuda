/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base
        cream: '#F5F4F0',
        ink: '#2C2C2A',
        muted: '#5F5E5A',
        faint: '#888780',
        line: '#EDEBE4',
        'line-soft': '#F1EFE8',

        // Brand navy-green (header, primary brand)
       navy: {
          DEFAULT: '#0B2545',
        },

        // Donor — green
        donor: {
          DEFAULT: '#639922',
          dark: '#3B6D11',
          light: '#EAF3DE',
          border: '#EAF3DE',
        },
        // Administrator — red
        admin: {
          DEFAULT: '#A32D2D',
          dark: '#501313',
          light: '#FCEBEB',
          border: '#FCEBEB',
        },
        // Beneficiary — blue
        beneficiary: {
          DEFAULT: '#185FA5',
          dark: '#042C53',
          light: '#E6F1FB',
          border: '#E6F1FB',
        },
        // Alerts / notices
        warn: {
          bg: '#FAEEDA',
          border: '#F3DFB0',
          text: '#6B4E12',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Arial', 'Helvetica', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
