# Deploy HexaSend on Hostinger VPS with Docker

Step-by-step guide to run HexaSend in Docker on a Hostinger VPS.

---

## Prerequisites

- A **Hostinger VPS** (KVM) with root or sudo access.
- Your domain (e.g. `hexasend.com`) pointed to the VPS IP (A record).

---

## Step 1: Connect to your VPS

```bash
ssh root@YOUR_VPS_IP
# or: ssh your_username@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with the IP shown in the Hostinger VPS panel.

---

## Step 2: Install Docker and Docker Compose

On a fresh Ubuntu/Debian VPS:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Add your user to docker group (if not root)
usermod -aG docker $USER
# Then log out and back in, or run: newgrp docker

# Install Docker Compose (plugin)
apt install -y docker-compose-plugin

# Check
docker --version
docker compose version
```

---

## Step 3: Upload your project to the VPS

**Option A – Git (recommended)**

```bash
# On VPS, clone your repo (use your actual repo URL)
cd /var/www   # or any directory you prefer
git clone https://github.com/YOUR_USERNAME/secureshare.git hexasend
cd hexasend
```

**Option B – Upload via SFTP/SCP**

From your local machine (in the project root):

```bash
scp -r . root@YOUR_VPS_IP:/var/www/hexasend
```

Then on the VPS:

```bash
cd /var/www/hexasend
```

---

## Step 4: Create production `.env` (optional)

```bash
cd /var/www/hexasend   # or your project path

# Copy example and edit
cp .env.example .env
nano .env
```

Example `.env`:

```env
NODE_ENV=production
PORT=5000
```

To expose the app on port **80** (for Nginx or direct access), set in `.env` or when running:

```env
APP_PORT=80
```

Save and exit (Ctrl+O, Enter, Ctrl+X in nano).

---

## Step 5: Build and run with Docker Compose

```bash
cd /var/www/hexasend

# Build the image
docker compose build

# Start the app (detached)
docker compose up -d

# Check status
docker compose ps
docker compose logs -f hexasend-app   # Ctrl+C to exit logs
```

The app listens inside the container on port **5000**.  
By default it is mapped to **3001** on the host (`APP_PORT` in `.env` overrides this).

---

## Step 6: Open the app in the browser

- **If you mapped port 3001:**  
  `http://YOUR_VPS_IP:3001`

- **If you set APP_PORT=80:**  
  `http://YOUR_VPS_IP`

- **With Nginx as reverse proxy:**  
  Use your domain, e.g. `https://hexasend.com` (see Step 7).

---

## Step 7: (Optional) Nginx reverse proxy and HTTPS

Use this if you want to serve the app on a domain with HTTPS.

**7.1 – Install Nginx and Certbot**

```bash
apt install -y nginx certbot python3-certbot-nginx
```

**7.2 – Configure Nginx**

Create a site config (replace `hexasend.com` with your domain):

```bash
nano /etc/nginx/sites-available/hexasend
```

Paste (adjust `server_name` and proxy port if you use something other than 3001):

```nginx
server {
    listen 80;
    server_name hexasend.com www.hexasend.com;

    client_max_body_size 1G;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and test:

```bash
ln -s /etc/nginx/sites-available/hexasend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**7.3 – Get SSL certificate**

```bash
certbot --nginx -d hexasend.com -d www.hexasend.com
```

Follow the prompts. Certbot will adjust Nginx for HTTPS automatically.

---

## Step 8: Useful Docker commands

```bash
# View logs
docker compose logs -f hexasend-app

# Restart app
docker compose restart

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Stop
docker compose down

# Check health (if supported)
docker inspect hexasend-app --format='{{.State.Health.Status}}'
```

---

## Step 9: Firewall (recommended)

If you use UFW and only want HTTP/HTTPS and SSH:

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
ufw status
```

If you expose the app directly on a high port (e.g. 3001) instead of Nginx:

```bash
ufw allow 3001
```

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | SSH into Hostinger VPS |
| 2 | Install Docker and Docker Compose |
| 3 | Upload project (git clone or scp) |
| 4 | Create `.env` (optional, set `APP_PORT` if needed) |
| 5 | `docker compose build` then `docker compose up -d` |
| 6 | Open app: `http://VPS_IP:3001` or your domain |
| 7 | (Optional) Nginx + Certbot for HTTPS |
| 8 | Use `docker compose logs/restart/down` as needed |
| 9 | (Optional) Configure UFW firewall |

---

## Troubleshooting

- **App not reachable:**  
  Check `docker compose ps` and `docker compose logs hexasend-app`.  
  Ensure the host port (e.g. 3001 or 80) is open in the firewall.

- **WebSocket (file transfer) fails:**  
  Nginx must proxy `/ws` (see Step 7).  
  If using Cloudflare or another proxy, enable WebSockets.

- **Build fails:**  
  Run `docker compose build --no-cache` and check the build log for missing dependencies or Node version.

- **“File metadata missing” or upload errors:**  
  Ensure the container has enough memory and that you are not behind a proxy that strips headers or limits body size (`client_max_body_size` in Nginx).

Your Dockerfile is already set up for production: multi-stage build, non-root user, health check on `/api/health`, and production-only dependencies.
