variable "app_name" {
  type        = string
  description = "Префикс имен ресурсов"
}

variable "cors_origins" {
  type        = list(string)
  description = "Разрешенные CORS-происхождения и redirect URI"
}

variable "s3_frontend_bucket" {
  type        = string
  description = "Имя бакета для callback.html"
}

variable "user_password" {
  type        = string
  sensitive   = true
  description = "Пароль тестового пользователя"
}