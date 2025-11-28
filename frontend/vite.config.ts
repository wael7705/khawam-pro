import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React vendor
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor'
          }
          // UI libraries
          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'ui-vendor'
          }
          // Chart libraries removed - using custom simple charts
          // PDF libraries
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-vendor'
          }
          // Utils
          if (id.includes('axios') || id.includes('zustand')) {
            return 'utils-vendor'
          }
          // XLSX
          if (id.includes('xlsx')) {
            return 'xlsx-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
