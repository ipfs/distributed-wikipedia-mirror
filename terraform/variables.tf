variable "public_key" {
  description = "SSH public key."
  type        = string
  sensitive = true
}

variable "ami_owner_id" {
  description = "AMI owner ID."
  type = string
  default = "642361402189"
}
