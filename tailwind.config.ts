import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yt-black': '#0f0f0f',
        'yt-surface': '#1a1a1a',
        'yt-surface-2': '#212121',
        'yt-surface-3': '#2d2d2d',
        'yt-red': '#ff0000',
        'yt-red-dark': '#cc0000',
        'yt-text': '#f1f1f1',
        'yt-text-secondary': '#aaaaaa',
        'yt-border': '#3d3d3d',
      },
    },
  },
  plugins: [],
};

export default config;
