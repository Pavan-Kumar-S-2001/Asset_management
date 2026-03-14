import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true, // IMPORTANT for Docker
    proxy: {
      "/api": {
        target: "http://backend:5000", // Docker service name
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    sourcemap: false,
    minify: true,
  },
});