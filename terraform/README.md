# Terraform Deployment — OneWay Interview

One-command deployment of the OneWay Interview platform to AWS EC2.

## What It Creates

| Resource | Details |
|----------|---------|
| **EC2 Instance** | Ubuntu 24.04 LTS, t3.small (configurable) |
| **Security Group** | Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| **IAM Role** | SSM access for keyless management |
| **Self-signed SSL** | Generated automatically for HTTPS |
| **Nginx** | Reverse proxy + static file serving |
| **PM2** | Process manager for the Node.js API |

The instance bootstraps itself via `user_data` — no manual SSH required.

## Prerequisites

1. **Terraform** >= 1.5 installed ([download](https://developer.hashicorp.com/terraform/downloads))
2. **AWS CLI** configured with valid credentials (`aws configure` or SSO)
3. **EC2 Key Pair** created in the target region ([create here](https://console.aws.amazon.com/ec2/home#KeyPairs:))

## Quick Start

```bash
cd terraform/

# 1. Create your tfvars file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set key_pair_name at minimum

# 2. Initialize Terraform
terraform init

# 3. Preview changes
terraform plan

# 4. Deploy (takes ~5 minutes for full setup)
terraform apply
```

After `terraform apply` completes, you'll see:

```
Outputs:

admin_portal_url     = "https://54.x.x.x/"
candidate_portal_url = "https://54.x.x.x/candidate/"
api_health_url       = "https://54.x.x.x/api/health"
ssh_command          = "ssh -i <your-key>.pem ubuntu@54.x.x.x"
ssm_connect_command  = "aws ssm start-session --target i-xxxxx ..."
```

> **Note:** The EC2 instance needs 3-5 minutes after creation to finish installing
> and building everything. Check progress with the `setup_log_command` output.

## Accessing the App

### Option A: Direct Browser Access (if SG rules are intact)

Open `https://<PUBLIC_IP>/` in your browser. Accept the self-signed certificate warning.

### Option B: SSM Port Forwarding (if SecurityHub strips SG rules)

Some AWS accounts have SecurityHub auto-remediation that removes public inbound
security group rules. In that case, use SSM port forwarding:

```bash
# Install SSM plugin first (one-time):
# https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

# Forward EC2 port 443 → localhost:8443
aws ssm start-session \
  --target <INSTANCE_ID> \
  --document-name AWS-StartPortForwardingSession \
  --parameters "portNumber=['443'],localPortNumber=['8443']" \
  --region us-east-1

# Then open: https://localhost:8443/
```

## Managing the Instance

```bash
# SSH in
ssh -i your-key.pem ubuntu@<PUBLIC_IP>

# Or use SSM (no key needed)
aws ssm start-session --target <INSTANCE_ID>

# Check app status
pm2 status

# View API logs
pm2 logs oneway-api

# View setup log
cat /var/log/oneway-setup.log

# Restart after code changes
cd /home/ubuntu/OneWayInterview
git pull
cd server && npm install
cd ../admin-app && npm run build
cd ../candidate-app && npm run build
pm2 restart oneway-api
```

## Tear Down

```bash
terraform destroy
```

This removes all created AWS resources (EC2, SG, IAM role).

## Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `key_pair_name` | **(required)** | EC2 key pair name |
| `aws_region` | `us-east-1` | AWS region |
| `instance_type` | `t3.small` | EC2 instance type |
| `volume_size` | `20` | Root volume GB |
| `app_name` | `oneway-interview` | Name tag prefix |
| `github_repo` | `https://github.com/tjblavakumar/OneWayInterview.git` | Repo to clone |
| `server_port` | `5001` | Express API port |
| `enable_ssh` | `true` | Allow SSH inbound |
| `ssh_cidr_blocks` | `["0.0.0.0/0"]` | SSH allowed CIDRs |
| `allowed_account_ids` | `[]` | Safety: restrict to specific accounts |
