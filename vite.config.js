import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local development only: forward /api calls from the Vite dev server (port 5173)
    // to the Express backend (port 8080), so the frontend can always call /api/...
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
