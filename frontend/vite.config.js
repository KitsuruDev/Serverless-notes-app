import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Запуск:
//   npm run dev                                   — http://localhost:5173 (Vite proxy -> Floci)
//   TARGET=http://host.docker.internal:4566 npm run dev — из контейнера
// Прокси нужен, потому что Floci не отдаёт CORS-заголовки; через Vite всё same-origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.TARGET || 'http://localhost:4566'
  return {
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Cognito (Floci): managed-login форма + oauth2 token endpoint
        '/cognito-idp': { target, changeOrigin: true },
        // AppSync GraphQL
        '/v1/apis': { target, changeOrigin: true },
      },
    },
  }
})
