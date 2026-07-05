import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app from /Nexus-Nook-mock-api/.
// Build output goes to the default `dist` directory (web/dist).
export default defineConfig({
  base: '/Nexus-Nook-mock-api/',
  plugins: [react()],
})
