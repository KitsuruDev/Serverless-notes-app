resource "aws_appsync_graphql_api" "notes" {
  name                = "${var.app_name}-api"
  authentication_type = "AMAZON_COGNITO_USER_POOLS"

  user_pool_config {
    user_pool_id   = aws_cognito_user_pool.notes.id
    default_action = "ALLOW"
  }

  schema = file("${path.module}/schema.graphql")
}

resource "aws_iam_role" "appsync" {
  name = "${var.app_name}-appsync"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "appsync.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "appsync_dynamo" {
  role = aws_iam_role.appsync.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem"]
      Resource = [aws_dynamodb_table.notes.arn]
    }]
  })
}

resource "aws_appsync_datasource" "dynamo" {
  name             = "DynamoDB"
  api_id           = aws_appsync_graphql_api.notes.id
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync.arn

  dynamodb_config {
    table_name = aws_dynamodb_table.notes.name
  }
}

# --- Резольверы ---
resource "aws_appsync_resolver" "notes_list" {
  api_id           = aws_appsync_graphql_api.notes.id
  depends_on       = [aws_appsync_datasource.dynamo]
  type             = "Query"
  field            = "notes"
  data_source      = "DynamoDB"
  request_template = file("${path.module}/templates/notes_list.req.vtl")
  response_template = file("${path.module}/templates/notes_list.res.vtl")
}

resource "aws_appsync_resolver" "note_get" {
  api_id           = aws_appsync_graphql_api.notes.id
  depends_on       = [aws_appsync_datasource.dynamo]
  type             = "Query"
  field            = "note"
  data_source      = "DynamoDB"
  request_template = file("${path.module}/templates/note_get.req.vtl")
  response_template = file("${path.module}/templates/note_get.res.vtl")
}

resource "aws_appsync_resolver" "note_add" {
  api_id           = aws_appsync_graphql_api.notes.id
  depends_on       = [aws_appsync_datasource.dynamo]
  type             = "Mutation"
  field            = "addNote"
  data_source      = "DynamoDB"
  request_template = file("${path.module}/templates/note_add.req.vtl")
  response_template = file("${path.module}/templates/note_add.res.vtl")
}