terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway              = var.aws_endpoint
    cognitoidp              = var.aws_endpoint
    appsync                 = var.aws_endpoint
    dynamodb                = var.aws_endpoint
    iam                     = var.aws_endpoint
    sts                     = var.aws_endpoint
    s3                      = var.aws_endpoint
  }

  s3_use_path_style = true
}