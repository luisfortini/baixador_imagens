import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';

  return {
    plugins: [react()],
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/downloads': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
