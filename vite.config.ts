/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@radix-ui/react-slot",
      "lucide-react"
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('framer-motion') || id.includes('recharts')) {
              return 'vendor-charts';
            }
            return 'vendor-misc';
          }
          
          // Role-based page splitting for better code splitting
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/partner/')) {
            return 'pages-partner';
          }
          if (id.includes('/pages/subcontractor/')) {
            return 'pages-subcontractor';
          }
          if (id.includes('/pages/employee/')) {
            return 'pages-employee';
          }
          if (id.includes('/pages/messages/')) {
            return 'pages-messages';
          }
          
          // Component chunks
          if (id.includes('/components/admin/')) {
            return 'components-admin';
          }
          if (id.includes('/components/partner/')) {
            return 'components-partner';
          }
          if (id.includes('/components/subcontractor/')) {
            return 'components-subcontractor';
          }
          if (id.includes('/components/employee/')) {
            return 'components-employee';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}));
