output "graphql_endpoint" {
  value = "http://localhost:4566/v1/apis/${aws_appsync_graphql_api.notes.id}/graphql"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.notes.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "token_endpoint" {
  value = "http://localhost:4566/cognito-idp/oauth2/token"
}