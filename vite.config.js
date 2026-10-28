import { defineConfig } from 'vite';

export default defineConfig({
  base: '/arduino-3d/',
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@babylonjs')) return 'babylon';
        },
      },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
