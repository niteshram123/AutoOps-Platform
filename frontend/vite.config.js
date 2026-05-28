import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
    proxy: {
      '/api/prometheus': {
        target: 'http://localhost:9090',
        rewrite: (path) => path.replace(/^\/api\/prometheus/, ''),
        changeOrigin: true,
      },
      '/api/healing': {
        target: 'http://localhost:8888',
        rewrite: (path) => path.replace(/^\/api\/healing/, ''),
        changeOrigin: true,
      },
      '/api/jenkins': {
        target: 'http://localhost:8080',
        rewrite: (path) => path.replace(/^\/api\/jenkins/, ''),
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (error, req, res) => {
            const body = JSON.stringify({
              error: 'Jenkins unavailable',
              message: error?.code || 'ECONNREFUSED',
            })
            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
              })
            }
            res.end(body)
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
