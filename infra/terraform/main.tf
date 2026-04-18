terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "cloudpilot"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner_tag
    }
  }
}

###############################################################################
# VPC
###############################################################################
resource "aws_vpc" "cloudpilot" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "cloudpilot-vpc-${var.environment}" }
}

###############################################################################
# Internet Gateway
###############################################################################
resource "aws_internet_gateway" "cloudpilot" {
  vpc_id = aws_vpc.cloudpilot.id
  tags   = { Name = "cloudpilot-igw-${var.environment}" }
}

###############################################################################
# Public Subnet
###############################################################################
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.cloudpilot.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = { Name = "cloudpilot-public-${var.environment}" }
}

###############################################################################
# Route Table
###############################################################################
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.cloudpilot.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cloudpilot.id
  }
  tags = { Name = "cloudpilot-rt-${var.environment}" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

###############################################################################
# Security Group
###############################################################################
resource "aws_security_group" "cloudpilot" {
  name        = "cloudpilot-sg-${var.environment}"
  description = "CloudPilot security group"
  vpc_id      = aws_vpc.cloudpilot.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Kubernetes NodePort range"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "ArgoCD UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "cloudpilot-sg-${var.environment}" }
}

###############################################################################
# SSH Key Pair
###############################################################################
data "aws_key_pair" "cloudpilot" {
  key_name = "cloudpilot-key"
}

###############################################################################
# EC2 Instance
###############################################################################
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "cloudpilot" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name = data.aws_key_pair.cloudpilot.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.cloudpilot.id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
    tags = { Name = "cloudpilot-root-${var.environment}" }
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y python3 python3-pip
  EOF

  tags = { Name = "cloudpilot-node-${var.environment}" }
}

###############################################################################
# Elastic IP
###############################################################################
resource "aws_eip" "cloudpilot" {
  instance = aws_instance.cloudpilot.id
  domain   = "vpc"
  tags     = { Name = "cloudpilot-eip-${var.environment}" }
}

###############################################################################
# Auto-generate Ansible inventory file from Terraform output
###############################################################################
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/inventory.tpl", {
    public_ip        = aws_eip.cloudpilot.public_ip
    private_key_path = var.ssh_private_key_path
  })
  filename        = "${path.module}/../ansible/inventory/hosts.ini"
  file_permission = "0644"
}