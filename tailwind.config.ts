import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        darcula: {
          bg: '#2B2B2B',
          surface: '#3C3F41',
          elevated: '#45494A',
          border: '#515151',
          text: '#A9B7C6',
          'text-muted': '#808080',
          'text-bright': '#F8F8F2',
          blue: '#6897BB',
          green: '#6A8759',
          orange: '#CC7832',
          red: '#BC3F3C',
          yellow: '#FFC66D',
          purple: '#9876AA',
        },
      },
    },
  },
  plugins: [],
}
export default config
