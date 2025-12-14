import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.QINIU_API_KEY': JSON.stringify(env.QINIU_API_KEY),
        'process.env.QINIU_API_BASE_URL': JSON.stringify(env.QINIU_API_BASE_URL),
        'process.env.QINIU_TEXT_MODEL': JSON.stringify(env.QINIU_TEXT_MODEL),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || env.QINIU_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
