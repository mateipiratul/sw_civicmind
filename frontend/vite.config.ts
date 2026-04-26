import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const djangoOrigin = env.VITE_DJANGO_API_ORIGIN || 'http://localhost:8000'
  const aiOrigin = env.VITE_AI_SERVICE_ORIGIN || 'http://localhost:8001'

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      TanStackRouterVite(),
    ],
    server: {
      proxy: {
        '/api': djangoOrigin,
        '/rag': aiOrigin,
        '/mps': aiOrigin,
        '/feed': aiOrigin,
        '/qa': aiOrigin,
        '/messenger': aiOrigin,
        '/notifications': aiOrigin,
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
      },
    },
  }
})
