import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      buffer: 'buffer',
      events: 'events',
      util: path.resolve(__dirname, './src/lib/util-stub.ts'),
    },
  },
  optimizeDeps: {
    include: ['stream-browserify', 'buffer', 'events', 'socket.io-client', 'simple-peer'],
  },
})
