import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // React never talks to SQLite directly — everything under /api is
      // forwarded to the local Fastify server (see ../api).
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5175',
        changeOrigin: true,
      },
    },
  },
})
