terraform {
  required_providers {
    amazon = {
      source  = "hashicorp/aws"
      version = "4.5.0"
    }
  }

  required_version = "~> 1.1.4"
}
