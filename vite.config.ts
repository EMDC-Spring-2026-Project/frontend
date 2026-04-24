import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  // Load ALL env vars (.env, .env.local, .env.development, etc.)
  // Not just those starting with VITE_
  const env = loadEnv(mode, process.cwd(), "");

  // Detect if Vite is running inside a Docker container
  const inDocker = fs.existsSync("/.dockerenv") || env.DOCKER === "true";

  // Safe defaults:
  // - Host dev → talk to backend on host port 7004
  // - Vite in Docker → talk to Django service on its container port 7004
  const defaultTarget = inDocker ? "http://django-api:7004" : "http://127.0.0.1:7004";

  // Allow override via PROXY_TARGET in .env*
  const target = env.PROXY_TARGET || process.env.PROXY_TARGET || defaultTarget;


  return {
    plugins: [react()],
    build: {
      target: 'esnext', // Modern browsers for smaller bundles
      minify: 'esbuild', // Faster minification
      sourcemap: false, // Disable sourcemaps for prod
      chunkSizeWarningLimit: 1000, // Warn if chunks > 1MB
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libs for better caching
            vendor: ['react', 'react-dom'],
            ui: ['@mui/material', '@mui/icons-material'],
            router: ['react-router-dom'],
            state: ['zustand'],
          },
        },
      },
    },
    server: {
      watch: { usePolling: true },
      host: "0.0.0.0",
      hmr: { host: "localhost", port: 7001 }, // keep your existing HMR settings
      proxy: {
          "/api": {
            target,
            changeOrigin: true,
            secure: false,
            // Remove cookieDomainRewrite to preserve original cookie domains
            configure: (proxy, _options) => {
              proxy.on("error", (err) => console.log("proxy error", err));
              proxy.on("proxyReq", (_proxyReq, req) =>
                console.log("Sending Request to Target:", req.method, req.url)
              );
              proxy.on("proxyRes", (proxyRes, req) =>
                console.log("Received Response:", proxyRes.statusCode, req.url)
              );
            },
          },
        },
    },
  };
});