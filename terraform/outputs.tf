output "ssh_destination" {
  value = "ubuntu@${aws_instance.wikipedia-on-ipfs.public_dns}"
}
