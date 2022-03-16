output "docker_login_command" {
  value = "aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${aws_ecrpublic_repository.this.repository_uri}"
}

output "docker_build_command" {
  value = "docker build . --platform=linux/amd64 -f Dockerfile -t ${aws_ecrpublic_repository.this.repository_uri} -t ${aws_ecrpublic_repository.this.repository_uri}:$(date -u +%F) -t ${aws_ecrpublic_repository.this.repository_uri}:$(date -u +%s)"
}

output "docker_push_command" {
  value = "docker push --all-tags ${aws_ecrpublic_repository.this.repository_uri}"
}

output "docker_run_command" {
  value = "docker run --name wikipedia-on-ipfs --ulimit nofile=65536:65536 -d -p 4001:4001/tcp -p 4001:4001/udp ${aws_ecrpublic_repository.this.repository_uri}:latest <mirrorzim_arguments>"
}
