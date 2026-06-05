import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version || '1.0.0'),
    __GITHUB_REPO__: JSON.stringify(process.env.VITE_GITHUB_REPO || ''),
    __GITHUB_TOKEN__: JSON.stringify(process.env.VITE_GITHUB_TOKEN || '')
  },
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 }
});
