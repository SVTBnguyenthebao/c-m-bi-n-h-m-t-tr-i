/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // Polyfill process.env for the Gemini SDK and general usage
      'process.env': {
        API_KEY: env.API_KEY || '',
        ...env
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});