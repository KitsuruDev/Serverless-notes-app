// ============================================================
// Конфигурация фронтенда.
//
// Все HTTP-запросы идут САМЕ-ORIGIN через Vite-прокси
// (см. vite.config.js): '/cognito-idp/*' и '/v1/apis/*'
// проксируются на Floci. Поэтому CORS здесь не нужен.
//
// Живые ID берутся из notes-serverless/outputs.tf:
//   terraform output graphql_endpoint / cognito_client_id
//
// После каждого terraform destroy/apply ID меняются!
// Обновите их здесь (или в frontend/.env: VITE_APPS_API_ID,
// VITE_CLIENT_ID), например:
//   API_ID=$(terraform -chdir=.. output -raw appsync_api_id)
//   CLIENT_ID=$(terraform -chdir=.. output -raw cognito_client_id)
//
// Варианты запуска:
//   1) Vite dev-сервер (порт 5173): callback = <origin>/callback
//      (SPA fallback у Vite подхватывает любой путь).
//   2) Статический хостинг S3 (порт 4566): SPA fallback НЕТ,
//      поэтому callback — это физический объект callback.html,
//      задаётся через VITE_REDIRECT_URI при сборке:
//        VITE_REDIRECT_URI=http://<host>:4566/<bucket>/callback.html \
//        npm run build
// ============================================================

const env = import.meta.env

export const APPSYNC_API_ID = env.VITE_APPS_API_ID || '1a72a20c899b4a6ba288a7c819'
export const COGNITO_CLIENT_ID = env.VITE_CLIENT_ID || '63cfce6b810344c08d27cdafae'

export const REDIRECT_URI =
  env.VITE_REDIRECT_URI || `${window.location.origin}/callback`

export const SCOPES = ['openid', 'profile', 'email', 'notes/read', 'notes/write'].join(' ')

export const GRAPHQL_URL = `/v1/apis/${APPSYNC_API_ID}/graphql`
export const TOKEN_URL = '/cognito-idp/oauth2/token'
export const LOGIN_URL_BASE = '/cognito-idp/login'
