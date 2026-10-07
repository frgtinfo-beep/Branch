// Build: npm run build:css  (writes frontend/tailwind.css; commit the output)
// translations.js and the page scripts are scanned too: their strings carry class names.
module.exports = {
  content: ['./frontend/*.html', './frontend/*.js'],
  theme: {
    extend: {
      colors: {
        paper:              '#FFFFFF',
        ink:                '#05070F',
        background:         '#F7F7F7',
        'text-dark':        '#0A0D16',
        'text-light':       '#5B6472',
        'branch-blue-dark': '#032F8A',
        'branch-blue':      '#0B6DFF',
        'branch-cyan':      '#14B8E6',
        'branch-green':     '#78DB55',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
