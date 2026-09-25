import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Inline config stops Vite from picking up a postcss.config.js from a parent folder.
    // Tailwind v4 runs through @tailwindcss/vite, so no PostCSS plugins are needed.
    css: { postcss: { plugins: [] } },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          phone: path.resolve(__dirname, 'phone.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Lets the phone reach the dev server through a Cloudflare quick tunnel (random
      // *.trycloudflare.com host each run) or Tailscale. Basic auth (server/basicAuth.ts)
      // is the real access control here, not Vite's host allowlist.
      allowedHosts: ['.trycloudflare.com', '.ts.net'],
    },
  };
});
