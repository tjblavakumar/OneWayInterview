output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "admin_portal_url" {
  description = "Admin Portal URL"
  value       = "https://${aws_instance.app.public_ip}/"
}

output "candidate_portal_url" {
  description = "Candidate Portal URL"
  value       = "https://${aws_instance.app.public_ip}/candidate/"
}

output "api_health_url" {
  description = "API Health Check URL"
  value       = "https://${aws_instance.app.public_ip}/api/health"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i <your-key>.pem ubuntu@${aws_instance.app.public_ip}"
}

output "ssm_connect_command" {
  description = "SSM Session Manager command (no SSH key needed)"
  value       = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.aws_region}"
}

output "ssm_port_forward_command" {
  description = "SSM port forwarding command (use if SG rules are stripped by SecurityHub)"
  value       = "aws ssm start-session --target ${aws_instance.app.id} --document-name AWS-StartPortForwardingSession --parameters \"portNumber=['443'],localPortNumber=['8443']\" --region ${var.aws_region}"
}

output "setup_log_command" {
  description = "Command to view the setup log on the instance"
  value       = "aws ssm send-command --instance-ids ${aws_instance.app.id} --document-name AWS-RunShellScript --parameters commands=['cat /var/log/oneway-setup.log | tail -30'] --region ${var.aws_region}"
}

output "ami_id" {
  description = "Ubuntu AMI used"
  value       = data.aws_ami.ubuntu.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.app.id
}

output "note" {
  description = "Important notes"
  value       = <<-EOT
    ┌─────────────────────────────────────────────────────────┐
    │  Deployment takes 3-5 minutes after terraform apply.    │
    │  Check progress: cat /var/log/oneway-setup.log          │
    │  Accept the self-signed cert warning in your browser.   │
    │                                                         │
    │  If your AWS account has SecurityHub auto-remediation,  │
    │  SG inbound rules may be stripped. Use SSM port         │
    │  forwarding instead (see ssm_port_forward_command).     │
    └─────────────────────────────────────────────────────────┘
  EOT
}
