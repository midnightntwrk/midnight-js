import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      process: 'process/browser',
      buffer: 'buffer',
      util: 'util',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
    },
  },
  plugins: [
    react(),
    wasm(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/contract/*',
          dest: 'contract',
        },
      ],
    }),
    {
      name: 'custom-404',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/contract/')) {
            const filePath = path.join(server.config.root, 'src', req.url);

            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end('404 Not Found');
              return;
            }
          }
          next();
        });
      },
    },
  ],
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: 'public',
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
