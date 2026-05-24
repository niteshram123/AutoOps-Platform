# Local backend — state stored on disk.
# For production, replace with remote backend (S3, GCS, Terraform Cloud).
#
# Example remote backend (uncomment and configure):
# terraform {
#   backend "s3" {
#     bucket = "autoops-terraform-state"
#     key    = "autoops/terraform.tfstate"
#     region = "us-east-1"
#   }
# }

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
