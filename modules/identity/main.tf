resource "aws_cognito_user_pool" "notes" {
  name                     = "${var.app_name}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name            = "${var.app_name}-web"
  user_pool_id    = aws_cognito_user_pool.notes.id
  generate_secret = false

  allowed_oauth_scopes = [
    "email", "openid", "profile",
    "${var.app_name}/read", "${var.app_name}/write",
  ]
  allowed_oauth_flows                  = ["client_credentials", "code"]
  allowed_oauth_flows_user_pool_client = true
  supported_identity_providers         = ["COGNITO"]

  callback_urls = concat(
    var.cors_origins,
    [for o in var.cors_origins : "${o}/callback"],
    ["http://localhost:4566/${var.s3_frontend_bucket}/callback.html"]
  )
  logout_urls = var.cors_origins
}

resource "aws_cognito_user" "demo" {
  user_pool_id = aws_cognito_user_pool.notes.id
  username     = "dev@example.com"
  password     = var.user_password
  
  attributes = {
    email = "dev@example.com"
  }
  lifecycle {
    ignore_changes = [attributes]
  }
}