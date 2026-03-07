
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to resolve 'cwd' property missing on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the SDKs that expect it
      'process.env': {
        API_KEY: env.API_KEY,
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
        RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
        JWT_SECRET: env.JWT_SECRET
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          }
        }
      }
    }
  };
});
