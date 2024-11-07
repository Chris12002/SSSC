import { defineConfig, externalizeDepsPlugin, bytecodePlugin  } from 'electron-vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        include: ['electron-store'],
      }),
    ],
    build: {
      sourcemap: true,
      rollupOptions: {
        watch: {},
        output: {
          format: 'es',
        },
      },
    },
  },
  preload: {
    build: {
      watch: {},
      sourcemap: true,
      rollupOptions: {
        output: {
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    build: {
      sourcemap: true,
    }
    // Renderer configuration
  },
});
