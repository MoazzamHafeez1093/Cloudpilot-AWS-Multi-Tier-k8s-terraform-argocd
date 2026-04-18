variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "owner_tag" {
  description = "Owner tag for all resources"
  type        = string
  default     = "cloudpilot"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "ssh_public_key_path" {
  description = "Path to your SSH public key"
  type        = string
  default     = "~/.ssh/cloudpilot-key.pem"
}

variable "ssh_private_key_path" {
  description = "Path to your SSH private key (for Ansible inventory)"
  type        = string
  default     = "~/.ssh/cloudpilot-key.pem"
}

variable "allowed_ssh_cidrs" {
  description = "CIDRs allowed to SSH into the instance — your IP only"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}