import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        play: resolve(import.meta.dirname, 'play.html'),
        host: resolve(import.meta.dirname, 'host.html'),
        screen: resolve(import.meta.dirname, 'screen.html'),
      },
    },
  },
});
