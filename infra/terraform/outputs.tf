output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_eip.cloudpilot.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.cloudpilot.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.cloudpilot.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${aws_eip.cloudpilot.public_ip}"
}

output "app_url" {
  description = "Application URL"
  value       = "http://${aws_eip.cloudpilot.public_ip}:30000"
}

output "argocd_url" {
  description = "ArgoCD UI URL"
  value       = "http://${aws_eip.cloudpilot.public_ip}:8080"
}