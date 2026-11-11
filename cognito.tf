# Блоки moved говорят Terraform, что ресурсы переехали в модуль
moved {
  from = aws_cognito_user_pool.notes
  to   = module.identity.aws_cognito_user_pool.notes
}

moved {
  from = aws_cognito_user_pool_client.web
  to   = module.identity.aws_cognito_user_pool_client.web
}

moved {
  from = aws_cognito_user.demo
  to   = module.identity.aws_cognito_user.demo
}

# Вызов модуля
module "identity" {
  source             = "./modules/identity"
  app_name           = var.app_name
  cors_origins       = var.cors_origins
  s3_frontend_bucket = var.s3_frontend_bucket
  user_password      = var.user_password
}