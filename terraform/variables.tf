# ─── Required Variables ──────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
}

# ─── Optional Variables ──────────────────────────────────────

variable "instance_type" {
  description = "EC2 instance type (t3.small minimum recommended)"
  type        = string
  default     = "t3.small"
}

variable "volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "app_name" {
  description = "Application name used for tagging and naming"
  type        = string
  default     = "oneway-interview"
}

variable "github_repo" {
  description = "GitHub repository URL to clone"
  type        = string
  default     = "https://github.com/tjblavakumar/OneWayInterview.git"
}

variable "server_port" {
  description = "Port the Express API server listens on"
  type        = number
  default     = 5001
}

variable "enable_ssh" {
  description = "Whether to allow SSH access (port 22) from the internet"
  type        = bool
  default     = true
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access. Use [\"0.0.0.0/0\"] for anywhere."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allowed_account_ids" {
  description = "List of allowed AWS account IDs (optional safety guard)"
  type        = list(string)
  default     = []
}
