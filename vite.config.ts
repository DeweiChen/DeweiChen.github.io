import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  // three.js lives in its own lazy chunk (~270 kB gzip), loaded only for the immersive mode.
  build: { chunkSizeWarningLimit: 1100 },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
