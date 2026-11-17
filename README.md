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

### 2. Запуск эмулятора и создание S3
```bash
# Запуск Floci
docker compose up -d

# Создание S3-бакета для будущей публикации фронтенда
awslocal --endpoint-url http://localhost:4566 s3 mb s3://notes-frontend-bucket
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

## Скрипты автоматизации

В проекте предусмотрены вспомогательные скрипты для работы с приложением:

*   **`smoke_test.sh`** — скрипт автоматической проверки. Он получает Access Token через Cognito (метод Admin Auth) и делает тестовый GraphQL-запрос к AppSync, чтобы убедиться, что вся цепочка работает. Запуск: `bash smoke_test.sh`.
*   **`publish.sh`** — локальный скрипт для сборки фронтенда (с относительными путями) и загрузки файлов в S3 с правильными заголовками (`Content-Type`). Запуск: `bash frontend/publish.sh`.
*   **`publish_from_artifact.sh`** — скрипт для CI/CD (GitLab). Он не собирает проект заново, а берет готовые файлы из папки `dist` (артефакты предыдущей джобы) и загружает их в S3.

## Остановка и очистка
```bash
# Удалить инфраструктуру AWS, созданную Terraform
docker run --rm -v "$(pwd):/workspace" -v "${PWD}\.terraformrc:/tmp/.terraformrc" -e TF_CLI_CONFIG_FILE="/tmp/.terraformrc" -w /workspace hashicorp/terraform:latest destroy -auto-approve

# Удалить S3-бакет и все файлы в нём
awslocal --endpoint-url http://localhost:4566 s3 rb s3://notes-frontend-bucket --force

# Остановить и удалить контейнеры Floci
docker compose down
```