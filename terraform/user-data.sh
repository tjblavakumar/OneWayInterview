#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/oneway-setup.log) 2>&1

echo "============================================"
echo "  OneWay Interview — Automated EC2 Setup"
echo "  Started: $(date)"
echo "============================================"

APP_DIR="/home/ubuntu/OneWayInterview"
GITHUB_REPO="${github_repo}"
SERVER_PORT="${server_port}"

# ── 1. System updates ──────────────────────────
echo ""
echo "[1/9] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# ── 2. Install Node.js 20 ──────────────────────
echo ""
echo "[2/9] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "  Node: $(node -v)  npm: $(npm -v)"

# ── 3. Install Nginx ───────────────────────────
echo ""
echo "[3/9] Installing Nginx..."
apt-get install -y nginx

# ── 4. Install PM2 globally ────────────────────
echo ""
echo "[4/9] Installing PM2..."
npm install -g pm2

# ── 5. Get EC2 public IP (IMDSv2) ──────────────
echo ""
echo "[5/9] Retrieving EC2 public IP..."
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
echo "  Public IP: $PUBLIC_IP"

# ── 6. Generate self-signed SSL certificate ─────
echo ""
echo "[6/9] Generating self-signed SSL certificate..."
if [ ! -f /etc/ssl/certs/oneway-selfsigned.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/oneway-selfsigned.key \
        -out /etc/ssl/certs/oneway-selfsigned.crt \
        -subj "/C=US/ST=State/L=City/O=OneWayInterview/CN=$PUBLIC_IP"
    echo "  SSL certificate generated."
else
    echo "  SSL certificate already exists, skipping."
fi

# ── 7. Clone repo & build ───────────────────────
echo ""
echo "[7/9] Cloning repo and building apps..."

cd /home/ubuntu
if [ ! -d "$APP_DIR" ]; then
    git clone "$GITHUB_REPO"
fi

cd "$APP_DIR"
mkdir -p logs server/data server/uploads

# Server dependencies
echo "  Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production

# Create .env from template
cp -n .env.example .env 2>/dev/null || true

# Update .env for production
python3 -c "
import re
f = open('.env', 'r'); c = f.read(); f.close()
c = re.sub(r'ADMIN_APP_URL=.*', 'ADMIN_APP_URL=https://$PUBLIC_IP', c)
c = re.sub(r'CANDIDATE_APP_URL=.*', 'CANDIDATE_APP_URL=https://$PUBLIC_IP/candidate', c)
c = re.sub(r'NODE_ENV=.*', 'NODE_ENV=production', c)
c = re.sub(r'PORT=.*', 'PORT=$SERVER_PORT', c)
f = open('.env', 'w'); f.write(c); f.close()
print('  .env configured:')
print(c)
"

# Admin app
echo "  Building admin app..."
cd "$APP_DIR/admin-app"
npm install
npm run build

# Candidate app
echo "  Building candidate app..."
cd "$APP_DIR/candidate-app"
npm install
npm run build

# ── 8. Configure Nginx ──────────────────────────
echo ""
echo "[8/9] Configuring Nginx..."

cat > /etc/nginx/sites-available/oneway-interview << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/oneway-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/oneway-selfsigned.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 200M;

    # Admin Portal (root)
    root /home/ubuntu/OneWayInterview/admin-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Candidate Portal (/candidate/)
    location /candidate/ {
        alias /home/ubuntu/OneWayInterview/candidate-app/dist/;
        try_files $uri $uri/ /candidate/index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:SERVER_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINXEOF

# Replace the port placeholder (can't use shell variable inside heredoc with NGINXEOF)
sed -i "s|SERVER_PORT_PLACEHOLDER|$SERVER_PORT|g" /etc/nginx/sites-available/oneway-interview

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/oneway-interview /etc/nginx/sites-enabled/oneway-interview

nginx -t
systemctl restart nginx
systemctl enable nginx

# ── 9. Fix permissions & start PM2 ──────────────
echo ""
echo "[9/9] Starting API server with PM2..."

# Fix permissions — Nginx (www-data) needs to traverse /home/ubuntu
chmod 755 /home/ubuntu
chown -R ubuntu:ubuntu "$APP_DIR/logs" "$APP_DIR/server/data" "$APP_DIR/server/uploads"

# Create PM2 ecosystem config
cat > "$APP_DIR/deploy/ecosystem.config.js" << PMEOF
module.exports = {
  apps: [
    {
      name: 'oneway-api',
      cwd: '$APP_DIR/server',
      script: 'src/index.js',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $SERVER_PORT,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '$APP_DIR/logs/api-error.log',
      out_file: '$APP_DIR/logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
PMEOF

# Start PM2 as ubuntu user
su - ubuntu -c "cd $APP_DIR && pm2 start deploy/ecosystem.config.js"
su - ubuntu -c "pm2 save"

# Setup PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
su - ubuntu -c "pm2 save"

# ── Wait for API to be ready ────────────────────
echo ""
echo "Waiting for API to start..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:$SERVER_PORT/api/health > /dev/null 2>&1; then
        echo "  API is healthy!"
        break
    fi
    sleep 2
done

# ── Write deployment info ────────────────────────
cat > /home/ubuntu/deployment-info.txt << EOF
============================================
  OneWay Interview — Deployment Info
  Deployed: $(date)
============================================

  Public IP:        $PUBLIC_IP
  Admin Portal:     https://$PUBLIC_IP/
  Candidate Portal: https://$PUBLIC_IP/candidate/
  API Health:       https://$PUBLIC_IP/api/health

  Note: Accept the self-signed certificate warning.

  Useful commands:
    pm2 status              — check server status
    pm2 logs oneway-api     — view server logs
    pm2 restart oneway-api  — restart server
    sudo tail -f /var/log/nginx/error.log — Nginx errors
    cat /var/log/oneway-setup.log — this setup log

  SSM access (no SSH needed):
    aws ssm start-session --target <instance-id>

  Port forwarding (if SG rules are blocked):
    aws ssm start-session --target <instance-id> \\
      --document-name AWS-StartPortForwardingSession \\
      --parameters "portNumber=['443'],localPortNumber=['8443']"
    Then open: https://localhost:8443/
EOF

chown ubuntu:ubuntu /home/ubuntu/deployment-info.txt

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "  Admin Portal:     https://$PUBLIC_IP/"
echo "  Candidate Portal: https://$PUBLIC_IP/candidate/"
echo "  API Health:       https://$PUBLIC_IP/api/health"
echo ""
