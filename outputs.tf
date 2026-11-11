output "graphql_endpoint" {
  value = "http://localhost:4566/v1/apis/${aws_appsync_graphql_api.notes.id}/graphql"
}

output "cognito_user_pool_id" {
  value = module.identity.user_pool_id
}

output "cognito_client_id" {
  value = module.identity.client_id
}

output "token_endpoint" {
  value = "http://localhost:4566/cognito-idp/oauth2/token"
}