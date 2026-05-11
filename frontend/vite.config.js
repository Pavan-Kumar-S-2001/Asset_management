import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {

        target:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:5000'
            : 'http://backend:5000',

        changeOrigin: true,
        secure: false,
      }
    }
  }
})