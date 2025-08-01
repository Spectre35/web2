import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import million from 'million/compiler'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    million.vite({ 
      auto: true,        // ← Optimización automática
      mute: false,       // ← Ver qué se optimiza en consola
      optimize: true,    // ← Optimizaciones extra
      telemetry: false   // ← Deshabilitar telemetría
    }),
    react({
      // Optimizaciones de React
      fastRefresh: true,
      babel: {
        plugins: [
          // Plugin para optimizar renders
          ['@babel/plugin-transform-react-constant-elements']
        ]
      }
    })
  ],
  base: '/', // Base correcta para Render
  server: {
    port: parseInt(process.env.PORT) || 5174,
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Optimización de chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          utils: ['axios', 'xlsx']
        },
      },
    },
    // Optimizaciones de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Mejorar performance de build
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 1600
  },
  // Optimizaciones adicionales
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  preview: {
    port: parseInt(process.env.PORT) || 5174,
    historyApiFallback: true,
  },
  // Configuración para SPA routing
  publicDir: 'public'
})
