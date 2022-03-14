resource "aws_s3_bucket" "wikipedia-on-ipfs" {
  bucket = "wikipedia-on-ipfs"

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }
}

resource "aws_iam_user" "wikipedia-on-ipfs" {
  name = "wikipedia-on-ipfs"

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }
}

data "aws_iam_policy_document" "wikipedia-on-ipfs" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:PutObjectAcl",
    ]

    resources = ["${aws_s3_bucket.wikipedia-on-ipfs.arn}", "${aws_s3_bucket.wikipedia-on-ipfs.arn}/*"]
    effect    = "Allow"
  }
}

resource "aws_iam_user_policy" "wikipedia-on-ipfs" {
  name = "wikipedia-on-ipfs"
  user = "${aws_iam_user.wikipedia-on-ipfs.name}"

  policy = "${data.aws_iam_policy_document.wikipedia-on-ipfs.json}"
}

data "aws_ami" "wikipedia-on-ipfs" {
  most_recent = true

  filter {
    name   = "name"
    values = ["wikipedia-on-ipfs/*"]
  }

  owners = ["${var.ami_owner_id}"]
}

resource "aws_security_group" "wikipedia-on-ipfs" {
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

resource "aws_key_pair" "wikipedia-on-ipfs" {
  key_name = "wikipedia-on-ipfs"
  public_key = "${var.public_key}"
}

resource "aws_instance" "wikipedia-on-ipfs" {
  ami           = data.aws_ami.wikipedia-on-ipfs.id
  # t3.small doesn't have enough memory
  instance_type = "t3.medium"
  key_name = "${aws_key_pair.wikipedia-on-ipfs.key_name}"

  tags = {
    Name = "wikipedia-on-ipfs"
    Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
  }

  root_block_device {
    volume_size = 100
    volume_type = "gp3"

    tags = {
      Name = "wikipedia-on-ipfs"
      Url  = "https://github.com/ipfs/distributed-wikipedia-mirror"
    }
  }

  credit_specification {
    cpu_credits = "standard"
  }

  security_groups = ["${aws_security_group.wikipedia-on-ipfs.name}"]
}
