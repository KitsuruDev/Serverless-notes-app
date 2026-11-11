variable "region" {
  default = "us-east-1"
}

variable "aws_endpoint" {
  description = "Эндпоинт Floci. Для запуска Terraform в Docker используется host.docker.internal"
  default     = "http://host.docker.internal:4566"
}

variable "app_name" {
  default = "notes"
}

variable "user_password" {
  sensitive = true
  default   = "Notes#2024"
}

variable "s3_frontend_bucket" {
  default = "notes-frontend-bucket"
}

variable "cors_origins" {
  type    = list(string)
  default = ["http://localhost:5173", "http://localhost:4566"]
}