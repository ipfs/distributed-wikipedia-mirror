# --> wikipedia-on-ipfs.amazon-ebs.wikipedia-on-ipfs: AMIs were created:
# eu-central-1: ami-02ff7a8cff61c5d41

packer {
  required_plugins {
    amazon = {
      version = ">= 0.0.2"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws-region" {
  type    = string
  default = env("AWS_REGION")
}

source "amazon-ebs" "wikipedia-on-ipfs" {
  ami_name      = "wikipedia-on-ipfs/timestamp/{{timestamp}}"
  instance_type = "t3.micro"
  region        = "${var.aws-region}"
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/*ubuntu-focal-20.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"]
  }
  ssh_username = "ubuntu"
  tags = {
    OS_Version    = "Ubuntu"
    Release       = "Latest"
    Base_AMI_ID   = "{{ .SourceAMI }}"
    Base_AMI_Name = "{{ .SourceAMIName }}"
  }
}

build {
  name = "wikipedia-on-ipfs"
  sources = [
    "source.amazon-ebs.wikipedia-on-ipfs"
  ]

  provisioner "file" {
    source      = "../tools"
    destination = "/tmp/tools"
  }

  provisioner "shell" {
    script = "provisioner.sh"
  }
}
