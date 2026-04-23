# EC2 Setup Guide — OneWay Interview

## Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `oneway-interview` |
| **AMI** | Ubuntu Server 24.04 LTS (or 22.04) |
| **Instance type** | `t3.small` (2 vCPU, 2 GB RAM) — minimum recommended |
| **Key pair** | Create new or select existing `.pem` key |
| **Storage** | 20 GB gp3 (default is fine) |

3. **Security Group** — create new with these inbound rules:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP | SSH access |
| HTTPS | 443 | 0.0.0.0/0 | App access (camera requires HTTPS) |
| HTTP | 80 | 0.0.0.0/0 | Redirect to HTTPS |

4. Click **Launch Instance**

## Step 2: Connect to EC2

```bash
# Make your key read-only (first time only)
chmod 400 your-key.pem

# SSH into the instance
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

## Step 3: Run Setup Script

```bash
# Clone the repo
git clone https://github.com/tjblavakumar/OneWayInterview.git
cd OneWayInterview

# Make setup script executable and run it
chmod +x deploy/setup.sh
sudo bash deploy/setup.sh
```

The script will:
- Install Node.js 20, Nginx, PM2
- Generate a self-signed SSL certificate
- Install all npm dependencies
- Build both React apps for production
- Configure Nginx with SSL and reverse proxy
- Start the API server via PM2
- Enable auto-start on reboot

## Step 4: Access the App

Open in your browser:

```
https://<EC2-PUBLIC-IP>
```

> **Important:** Your browser will show a security warning because of the self-signed certificate.
> Click **Advanced → Proceed to site** (Chrome) or **Accept the Risk** (Firefox).
> This is safe — it only means the cert isn't from a public CA.

| URL | Service |
|-----|---------|
| `https://<EC2-PUBLIC-IP>/` | Admin Portal |
| `https://<EC2-PUBLIC-IP>/candidate/interview/<token>` | Candidate Interview |
| `https://<EC2-PUBLIC-IP>/api/health` | API Health Check |

## Step 5: Test Camera Access

1. Open Admin Portal from your **phone or laptop with a camera**
2. Create a position → add questions → invite a candidate
3. Copy the interview link from the green banner
4. Open the link on your phone/laptop — camera should work over HTTPS

## Useful Commands (on EC2)

```bash
# Check server status
pm2 status

# View server logs
pm2 logs oneway-api

# Restart server after code changes
cd /home/ubuntu/OneWayInterview
git pull
cd server && npm install
cd ../admin-app && npm run build
cd ../candidate-app && npm run build
pm2 restart oneway-api

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Camera not working?
- Ensure you're using `https://` (not `http://`)
- Accept the self-signed certificate warning first
- Check browser permissions for camera/microphone

### Can't connect to the site?
- Verify EC2 security group allows ports 80 and 443
- Check Nginx is running: `sudo systemctl status nginx`
- Check API server: `pm2 status`

### Need to change the server port?
- Edit `/home/ubuntu/OneWayInterview/server/.env`
- Update `PORT=5001` to your desired port
- Update `deploy/nginx.conf` proxy_pass accordingly
- Run `pm2 restart oneway-api && sudo systemctl restart nginx`
