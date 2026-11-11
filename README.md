# Notes Serverless Stack (Floci + Terraform + React)

Развертывание Serverless-приложения (AppSync, Cognito, DynamoDB) на локальном эмуляторе AWS (Floci). Всё работает без реальных ключей и затрат.

## Предварительные требования
*   Установленный **Docker Desktop**.
*   **Git Bash** или **WSL** (для запуска bash-скриптов).
*   Python 3 (для работы `awslocal`).

## Запуск за 10 минут

### 1. Подготовка окружения
Создайте и активируйте виртуальное окружение Python (для CLI AWS):
```bash
python -m venv .venv
source .venv/Scripts/activate  # Для Windows
pip install awscli awscli-local
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set region us-east-1
```

### 2. Запуск эмулятора AWS (Floci)
```bash
docker compose up -d
```

### 3. Развертывание инфраструктуры (Terraform)
Запускаем Terraform в Docker (чтобы не устанавливать локально). 
*Для обхода блокировок реестра используется файл `.terraformrc`.*
```bash
# Инициализация
docker run --rm -v "$(pwd):/workspace" -v "${PWD}\.terraformrc:/tmp/.terraformrc" -e TF_CLI_CONFIG_FILE="/tmp/.terraformrc" -w /workspace hashicorp/terraform:latest init

# Создание ресурсов
docker run --rm -v "$(pwd):/workspace" -v "${PWD}\.terraformrc:/tmp/.terraformrc" -e TF_CLI_CONFIG_FILE="/tmp/.terraformrc" -w /workspace hashicorp/terraform:latest apply -auto-approve
```
*Скопируйте значения `cognito_client_id` и `graphql_endpoint` из вывода команды.*

### 4. Настройка и запуск Frontend
1. Откройте `frontend/src/config.js` и подставьте скопированные ID в переменные `COGNITO_CLIENT_ID` и `APPSYNC_API_ID` (ID берется из середины ссылки `graphql_endpoint`).
2. Запустите dev-сервер (через Docker, чтобы не ставить Node.js):
```bash
cd frontend
docker run --rm -it -p 5173:5173 -v "$(pwd):/app" -w /app -e TARGET=http://host.docker.internal:4566 node:20-alpine sh -c "npm install && npm run dev"
```

## Проверка работоспособности (Smoke Test)
1. Откройте браузер: **http://localhost:5173**
2. Войдите в систему:
   *   **Логин**: `dev@example.com`
   *   **Пароль**: `Notes#2024`
3. Создайте новую заметку. Если она появилась в списке и сохраняется после обновления страницы — **всё работает**.

## Остановка и очистка
```bash
# Удалить инфраструктуру AWS
docker run --rm -v "$(pwd):/workspace" -v "${PWD}\.terraformrc:/tmp/.terraformrc" -e TF_CLI_CONFIG_FILE="/tmp/.terraformrc" -w /workspace hashicorp/terraform:latest destroy -auto-approve

# Остановить Floci
docker compose down
```