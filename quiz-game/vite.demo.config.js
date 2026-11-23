import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// 서버 없이 브라우저 안에서만 도는 솔로 데모를 한 파일(iife)로 묶는다.
export default defineConfig({
  build: {
    outDir: 'demo/dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // 스프라이트 PNG를 data: URI로 포함
    lib: { entry: resolve(import.meta.dirname, 'demo/main.js'), formats: ['iife'], name: 'QuizDemo', fileName: () => 'demo.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
