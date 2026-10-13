import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: "/hospital-management-system/",
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//, priority: 30 },
            { name: 'vendor-animation', test: /node_modules\/(framer-motion|motion-dom|motion-utils)\//, priority: 20 },
            { name: 'vendor-supabase', test: /node_modules\/@supabase\//, priority: 10 },
          ],
        },
      },
    },
  },
})
