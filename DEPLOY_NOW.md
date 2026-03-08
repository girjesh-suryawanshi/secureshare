# 🚀 HexaSend VPS Deployment Guide (Hostinger)

Follow these steps to deploy your hardened, AdSense-ready application to your VPS.

## 1. Prepare the VPS
Connect to your VPS and install Docker:
```bash
# Update and install Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx
```

## 2. Deploy the Application
Upload your code (via Git or SFTP) to `/var/www/hexasend`, then run:
```bash
cd /var/www/hexasend
cp .env.example .env
# Edit .env if you need a different port
mkdir -p uploads
chown -R 1001:1001 uploads  # Important: Give container user (1001) write access
docker compose up -d --build
```

## 3. Configure Nginx & SSL (HTTPS)
This is critical for AdSense approval and real-time streaming.
```bash
# Copy the config
cp nginx-hexasend.conf /etc/nginx/sites-available/hexasend
# Note: Ensure 'proxy_buffering off' is in the config to prevent transfer hangs
ln -s /etc/nginx/sites-available/hexasend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get your SSL Certificate
certbot --nginx -d hexasend.com -d www.hexasend.com
```
*After Certbot finishes, it will automatically update your Nginx file to handle HTTPS.*

## 4. Verify
- Visit `https://hexasend.com`
- Check your AdSense meta tag in the source code (it's already in your `index.html`).
- **Resubmit to Google AdSense!**
