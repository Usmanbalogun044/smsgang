# SMS Gang - Production Deployment Guide

## Architecture Overview

```
VPS (Ubuntu 22.04)
├── MySQL 8.0 (external, native install)
│   ├── Database: smsgang
│   ├── User: smsgang
│   └── Automated backups
├── Docker Compose
│   ├── App Container (Laravel + FPM)
│   ├── Nginx Container (reverse proxy)
│   ├── Redis Container (cache/queue)
│   ├── Dozzle (log viewer)
│   └── Swagger UI (API docs)
└── GitHub Actions (auto-deploy on push)
```

---

## Pre-Requirements

- Ubuntu 22.04 LTS VPS with at least 2GB RAM, 2 vCPU
- Domain name with DNS configured
- SSH access to VPS
- GitHub repository with production branch

---

## Step 1: VPS Initial Setup

### 1.1 SSH into your VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Update system

```bash
apt update && apt upgrade -y
apt install -y curl wget git htop
```

### 1.3 Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root
```

### 1.4 Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

---

## Step 2: MySQL Setup (Native Install)

### 2.1 Install MySQL Server

```bash
apt install -y mysql-server
```

### 2.2 Secure MySQL Installation

```bash
mysql_secure_installation

# When prompted:
# - Set root password: [strong-password]
# - Remove anonymous users: Yes
# - Disable root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes
```

### 2.3 Create SMS Gang Database & User

```bash
mysql -u root -p

# Enter root password when prompted, then run:
CREATE DATABASE smsgang CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smsgang'@'localhost' IDENTIFIED BY 'strong-db-password-here';
GRANT ALL PRIVILEGES ON smsgang.* TO 'smsgang'@'localhost';
GRANT ALL PRIVILEGES ON smsgang.* TO 'smsgang'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 2.4 Enable MySQL to start on boot

```bash
systemctl enable mysql
systemctl start mysql
systemctl status mysql
```

### 2.5 Setup Automated Backups

```bash
mkdir -p /backups/mysql
chmod 700 /backups/mysql

# Create backup script
cat > /usr/local/bin/backup-mysql.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smsgang_$DATE.sql.gz"

mysqldump -u root -p$(cat /root/.mysql_password) smsgang | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/backup-mysql.sh

# Store root password securely (for automation)
echo "your-mysql-root-password" > /root/.mysql_password
chmod 600 /root/.mysql_password

# Setup daily cron job (2 AM every day)
echo "0 2 * * * /usr/local/bin/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1" | crontab -
```

---

## Step 3: Clone & Setup Project

### 3.1 Clone repository

```bash
cd /opt
git clone https://github.com/yourusername/smsgang.git
cd smsgang/backend
```

### 3.2 Create production environment file

```bash
cat > .env.production << 'EOF'
APP_NAME=SMSGang
APP_ENV=production
APP_DEBUG=false
APP_URL=https://smsgang.com

LOG_CHANNEL=telegram
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=info

# External MySQL Configuration
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=smsgang
DB_USERNAME=smsgang
DB_PASSWORD=strong-db-password-here

# External Redis Configuration
REDIS_CLIENT=predis
REDIS_HOST=localhost
REDIS_PASSWORD=strong-redis-password-here
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

BROADCAST_CONNECTION=log
CACHE_STORE=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# Frontend URLs
FRONTEND_URL=https://smsgang.com
ADMIN_URL=https://admin.smsgang.com
VERIFY_PAYMENT_URL=https://smsgang.com/orders

# API Keys (Set these from GitHub Secrets in CI/CD)
FIVESIM_API_KEY=${FIVESIM_API_KEY}
LENDOVERIFY_API_KEY=${LENDOVERIFY_API_KEY}
LENDOVERIFY_BASE_URL=https://api.lendoverify.com
CURRENCY_API_KEY=${CURRENCY_API_KEY}
CURRENCY_API_HOST=api.exchangerate-api.com
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
EOF
```

### 3.3 Create production docker-compose override

```bash
# Use the built-in docker-compose.prod.yml for production
cp docker-compose.prod.yml docker-compose.override.yml
```

---

## Step 4: Docker Setup

### 4.1 Create required directories

```bash
mkdir -p ./storage/{app,framework/cache,framework/sessions,framework/views,logs}
mkdir -p ./bootstrap/cache
chmod -R 755 ./storage ./bootstrap/cache
```

### 4.2 Build Docker image for production

```bash
docker-compose build --no-cache app
```

### 4.3 Start containers

```bash
export APP_ENV=production
export DB_HOST=localhost
export REDIS_HOST=localhost
docker-compose -f docker-compose.prod.yml up -d
```

### 4.4 Run initial migrations

```bash
docker-compose -f docker-compose.prod.yml exec app php artisan migrate --force
docker-compose -f docker-compose.prod.yml exec app php artisan cache:clear
docker-compose -f docker-compose.prod.yml exec app php artisan config:cache
```

### 4.5 Verify containers are running

```bash
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# smsgang-backend-prod       - running
# smsgang-nginx-prod         - running
# smsgang-redis-prod         - running
# smsgang-dozzle-prod        - running
# smsgang-swagger-prod       - running
```

---

## Step 5: SSL/HTTPS Setup (Let's Encrypt)

### 5.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Generate SSL Certificate

```bash
certbot certonly --standalone -d smsgang.com -d www.smsgang.com -d admin.smsgang.com

# Follow prompts to set up automatic renewal
```

### 5.3 Update Nginx configuration

Your [Nginx config](server/default-production.conf) already references `/etc/letsencrypt`. Just verify the paths are correct.

### 5.4 Auto-renewal

```bash
systemctl enable certbot.timer
systemctl start certbot.timer
certbot renew --dry-run  # Test renewal process
```

---

## Step 6: Monitoring & Health Checks

### 6.1 View logs

```bash
# App logs
docker-compose -f docker-compose.prod.yml logs -f app

# Nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Redis logs
docker-compose -f docker-compose.prod.yml logs -f redis

# Web UI: http://your-vps-ip:9001 (Dozzle)
```

### 6.2 Health check

```bash
curl http://localhost/health  # Should return 200 OK
```

### 6.3 Monitor via Dozzle

```
Logs: http://your-vps-ip:9001
Swagger API: http://your-vps-ip:9002
```

---

## Step 7: GitHub Actions CI/CD Setup

### 7.1 Create GitHub Secrets

Go to GitHub → Settings → Secrets → New repository secret

```
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE=yourusername/smsgang/backend
DOCKER_TAG=latest
DOCKER_USERNAME=yourusername
DOCKER_PASSWORD=your-github-token

# VPS Deployment
VPS_HOST=your-vps-ip
VPS_USER=root
VPS_SSH_KEY=<private-key>
VPS_APP_PATH=/opt/smsgang/backend

# API Keys
FIVESIM_API_KEY=...
LENDOVERIFY_API_KEY=...
CURRENCY_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 7.2 Create GitHub Actions workflow

Create [.github/workflows/deploy-prod.yml]

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker Image
        run: |
          cd backend
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/${{ secrets.DOCKER_IMAGE }}:${{ secrets.DOCKER_TAG }} .

      - name: Push to Registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login ${{ secrets.DOCKER_REGISTRY }} -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/${{ secrets.DOCKER_IMAGE }}:${{ secrets.DOCKER_TAG }}

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ${{ secrets.VPS_APP_PATH }}
            git pull origin main
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T app php artisan migrate --force
            docker-compose -f docker-compose.prod.yml exec -T app php artisan cache:clear
```

---

## Step 8: Maintenance Commands

### 8.1 View running services

```bash
cd /opt/smsgang/backend
docker-compose -f docker-compose.prod.yml ps
```

### 8.2 Restart services

```bash
# Restart app
docker-compose -f docker-compose.prod.yml restart app

# Restart all
docker-compose -f docker-compose.prod.yml restart
```

### 8.3 Check disk space

```bash
df -h
du -sh ./storage/*
```

### 8.4 MySQL backup

```bash
/usr/local/bin/backup-mysql.sh
ls -lah /backups/mysql/
```

### 8.5 Clear Laravel cache

```bash
docker-compose -f docker-compose.prod.yml exec app php artisan cache:clear
docker-compose -f docker-compose.prod.yml exec app php artisan config:clear
docker-compose -f docker-compose.prod.yml exec app php artisan route:clear
docker-compose -f docker-compose.prod.yml exec app php artisan view:clear
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if MySQL is running
systemctl status mysql

# Test connection from inside container
docker-compose -f docker-compose.prod.yml exec app mysql -h localhost -u smsgang -p smsgang -e "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis inside container
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# With password
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a "password" ping
```

### Disk Space Issues

```bash
# Clear old logs
sudo journalctl --vacuum=7d

# Clear Docker system
docker system prune -a -f
```

### Port Already in Use

```bash
# Find process using port
lsof -i :9000
kill -9 <PID>
```

---

## Rollback Procedure

```bash
# Revert to previous Docker image
git log --oneline
git revert <commit-hash>
git push origin main

# Or manually restart with previous image
docker-compose -f docker-compose.prod.yml down
docker image rm <broken-image-id>
docker-compose -f docker-compose.prod.yml up -d
```

---

## Performance Optimization

### Redis Persistence

By default, Redis has RDB snapshots. To enable AOF (Append Only File):

```bash
# Inside redis container
redis-cli CONFIG SET appendonly yes
```

### MySQL Performance Tuning

```bash
mysql -u root -p

# Check current settings
SHOW VARIABLES LIKE '%innodb%';
SHOW VARIABLES LIKE '%max_connections%';

# Increase max connections for production
SET GLOBAL max_connections = 1000;
```

### Laravel Optimization

```bash
docker-compose -f docker-compose.prod.yml exec app php artisan config:cache
docker-compose -f docker-compose.prod.yml exec app php artisan route:cache
docker-compose -f docker-compose.prod.yml exec app php artisan view:cache
docker-compose -f docker-compose.prod.yml exec app php artisan event:cache
```

---

## Support

For issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Check Dozzle: `http://your-vps-ip:9001`
3. Check health: `curl http://localhost/health`
4. Review this guide

---

**Last Updated:** March 15, 2026
**Maintainer:** SMS Gang Team
