import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base path is configurable so the same build works on Vercel/root ('/')
  // and on GitHub Pages project sites ('/membra-qr-gateway/') via VITE_BASE.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['protocol'],
  },
})
