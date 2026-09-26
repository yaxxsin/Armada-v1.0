import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// API target can be overridden (used by Docker Compose).
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:4001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
