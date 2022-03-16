output "ssh_command" {
  value = "ssh -i <private_key> ec2-user@${aws_instance.this.public_dns}"
}
