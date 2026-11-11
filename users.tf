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