#!/bin/bash
set -e

echo "============================================"
echo "  OneWay Interview — EC2 Setup Script"
echo "============================================"

export DEBIAN_FRONTEND=noninteractive
APP_DIR="/home/ubuntu/OneWayInterview"

# Detect public IP via IMDSv2
TOKEN=$(curl -sf -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
if [ -n "$TOKEN" ]; then
    PUBLIC_IP=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" \
      http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
else
    PUBLIC_IP="localhost"
fi
echo "  Public IP: $PUBLIC_IP"

# ── 1. System updates ──────────────────────────
echo ""
echo "[1/8] Updating system packages..."
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# ── 2. Install Node.js 20 ──────────────────────
echo ""
echo "[2/8] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "  Node: $(node -v)  npm: $(npm -v)"

# ── 3. Install Nginx ───────────────────────────
echo ""
echo "[3/8] Installing Nginx..."
apt-get install -y nginx

# ── 4. Install PM2 globally ────────────────────
echo ""
echo "[4/8] Installing PM2..."
npm install -g pm2

# ── 5. Generate self-signed SSL certificate ────
echo ""
echo "[5/8] Generating self-signed SSL certificate..."
if [ ! -f /etc/ssl/certs/oneway-selfsigned.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/oneway-selfsigned.key \
        -out /etc/ssl/certs/oneway-selfsigned.crt \
        -subj "/C=US/ST=State/L=City/O=OneWayInterview/CN=localhost"
    echo "  SSL certificate generated."
else
    echo "  SSL certificate already exists, skipping."
fi

# ── 6. Install dependencies & build ────────────
echo ""
echo "[6/8] Installing dependencies and building apps..."

cd "$APP_DIR"

# Create required directories
mkdir -p logs server/data server/uploads

# Server
echo "  Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production
cp -n .env.example .env 2>/dev/null || true

# Update .env for production
sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
sed -i "s|ADMIN_APP_URL=.*|ADMIN_APP_URL=https://$PUBLIC_IP|" .env
sed -i "s|CANDIDATE_APP_URL=.*|CANDIDATE_APP_URL=https://$PUBLIC_IP/candidate|" .env

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

# ── 7. Configure Nginx ─────────────────────────
echo ""
echo "[7/8] Configuring Nginx..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Copy our config
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/oneway-interview
ln -sf /etc/nginx/sites-available/oneway-interview /etc/nginx/sites-enabled/oneway-interview

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# ── 8. Start API server with PM2 ──────────────
echo ""
echo "[8/8] Starting API server with PM2..."

cd "$APP_DIR"

# Fix permissions — Nginx (www-data) needs to traverse /home/ubuntu
chmod 755 /home/ubuntu
chown -R ubuntu:ubuntu "$APP_DIR/logs" "$APP_DIR/server/data" "$APP_DIR/server/uploads"

# Stop existing if running
su - ubuntu -c "pm2 delete oneway-api 2>/dev/null || true"

# Start with ecosystem config
su - ubuntu -c "cd $APP_DIR && pm2 start deploy/ecosystem.config.js"

# Save PM2 process list and set up startup
su - ubuntu -c "pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
su - ubuntu -c "pm2 save"

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "  Admin Portal:     https://$PUBLIC_IP/"
echo "  Candidate Portal: https://$PUBLIC_IP/candidate/"
echo "  API Health:       https://$PUBLIC_IP/api/health"
echo ""
echo "  Note: Accept the self-signed certificate warning in your browser."
echo ""
echo "  Useful commands:"
echo "    pm2 status          — check server status"
echo "    pm2 logs oneway-api — view server logs"
echo "    pm2 restart oneway-api — restart server"
echo ""
