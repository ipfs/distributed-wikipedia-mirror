data "aws_ami" "this" {
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-2.0.20220304-x86_64-ebs"]
  }

  owners = ["591542846629"]
}

resource "aws_security_group" "this" {
  name        = "wikipedia-on-ipfs"

  ingress {
    description      = "SSH Access"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = "TCP Transport"
    from_port        = 4001
    to_port          = 4001
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = "UDP Transport"
    from_port        = 4001
    to_port          = 4001
    protocol         = "udp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }
}

resource "aws_key_pair" "this" {
  key_name = "wikipedia-on-ipfs"
  public_key = "${var.public_key}"

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }
}

resource "aws_instance" "this" {
  ami           = data.aws_ami.this.id
  # t3.small doesn't have enough memory
  instance_type = "t3.medium"
  key_name = "${aws_key_pair.this.key_name}"

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }

  root_block_device {
    volume_size = var.volume_size
    volume_type = "gp3"
    iops = var.volume_iops
    throughput = var.volume_throughput

    tags = {
      Name = "wikipedia-on-ipfs"
      Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
    }
  }

  credit_specification {
    cpu_credits = "standard"
  }

  security_groups = ["${aws_security_group.this.name}"]

  user_data = join("\n", [
    "#!/bin/bash",
    "sysctl -w net.core.rmem_max=2500000"
  ])
}
