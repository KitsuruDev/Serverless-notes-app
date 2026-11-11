#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${ENDPOINT:-http://localhost:4566}"
USER_POOL_ID="${USER_POOL_ID:-us-east-1_4b398afa3}"
CLIENT_ID="${CLIENT_ID:-22562e9cffdb4407a3086c8459}"
API_ID="${API_ID:-531401a4b7d64027ae3df8b68d}"

USERNAME="dev@example.com"
PASSWORD="Notes#2024"

echo "=== 1. Подготовка Cognito (включение Admin Auth) ==="
awslocal --endpoint-url "$ENDPOINT" cognito-idp update-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --explicit-auth-flows ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH > /dev/null 2>&1 || true
echo "Готово."

echo -e "\n=== 2. Авторизация в Cognito (получение Access Token) ==="
AUTH_RES=$(awslocal --endpoint-url "$ENDPOINT" cognito-idp admin-initiate-auth \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$USERNAME",PASSWORD="$PASSWORD" 2>&1) || true

if ! echo "$AUTH_RES" | grep -q "AccessToken"; then
    echo "Ошибка авторизации: не удалось получить токен."
    echo "$AUTH_RES"
    exit 1
fi

TOKEN=$(echo "$AUTH_RES" | grep -o '"AccessToken": "[^"]*' | cut -d'"' -f4)
echo "Токен получен: ${TOKEN:0:15}..."

echo -e "\n=== 3. GraphQL запрос к AppSync ==="
QUERY='{"query": "query { notes { id title body } }"}'
GQL_URL="$ENDPOINT/v1/apis/$API_ID/graphql"

GQL_RES=$(curl -s -w "\n%{http_code}" -X POST "$GQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$QUERY")

HTTP_CODE=$(echo "$GQL_RES" | tail -n1)
BODY=$(echo "$GQL_RES" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Ответ сервера: $BODY"

echo -e "\n=== 4. Проверка результата ==="
if [ "$HTTP_CODE" -eq 200 ] && echo "$BODY" | grep -q '"data"'; then
    echo "УСПЕХ: Smoke-тест пройден! AppSync вернул данные."
    exit 0
else
    echo "ОШИБКА: Smoke-тест не пройден."
    exit 1
fi