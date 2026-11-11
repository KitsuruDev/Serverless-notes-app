terraform {
  backend "s3" {
    bucket                      = "tfstate"
    key                         = "notes/dev/terraform.tfstate"
    region                      = "us-east-1"
    
    endpoints = {
      s3       = "http://host.docker.internal:4566"
      dynamodb = "http://host.docker.internal:4566"
    }
    
    dynamodb_table              = "tfstate-locks"
    use_path_style              = true
    access_key                  = "test"
    secret_key                  = "test"
    
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}