import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // التأكد من نسخ ملفات public إلى dist
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
          // React vendor - تجميع React libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          // UI libraries
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'ui-vendor'
          }
          // PDF libraries
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-vendor'
          }
          // Utils
          if (id.includes('node_modules/axios') || id.includes('node_modules/zustand')) {
            return 'utils-vendor'
          }
          // XLSX
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor'
          }
          // Leaflet
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'map-vendor'
          }
        },
        // تحسين أسماء الملفات لتجنب مشاكل الـ caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // ملفات public (مثل khawam_services.png) تُنسخ مباشرة بدون hash
          if (assetInfo.name && (assetInfo.name.includes('khawam_services') || assetInfo.name.includes('logo'))) {
            return '[name][extname]'
          }
          // باقي الملفات في assets مع hash
          return 'assets/[name]-[hash].[ext]'
        },
      },
      onwarn(warning, warn) {
        // تجاهل تحذيرات معينة
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        warn(warning)
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    // تحسين الـ minification - استخدام esbuild (أسرع وأخف)
    minify: 'esbuild',
    // تحسين الـ assets
    assetsInlineLimit: 4096, // inline assets أصغر من 4KB
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
