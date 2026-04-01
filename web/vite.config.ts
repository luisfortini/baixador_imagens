import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';

  return {
    plugins: [react()],
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: ['overtake-frontend-overtake.eh1kil.easypanel.host'],
    },
    server: {
      host: '0.0.0.0',
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