#!/usr/bin/env bash

# SMSGang Production Deployment Script
# This script handles pulling latest Docker images, updating containers, and running migrations

set -e

echo "🚀 Starting SMSGang Production Deployment..."

# Pull latest application image
echo "📦 Pulling latest Docker image..."
docker compose -f docker-compose.production.yml pull smsgangapp

# Ensure .env exists
if [ -f .env.production ] && [ ! -f .env ]; then
    echo "⚙️  Setting up .env from .env.production..."
    cp .env.production .env
fi

# Backup current database
echo "💾 Backing up database..."
BACKUP_FILE="db_backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose -f docker-compose.production.yml exec -T smsgangdatabase mysqldump -u smsgang -psmsgang101 smsgang > "$BACKUP_FILE" || echo "⚠️  Database backup skipped (DB may not be ready yet)"

# Stop current containers
echo "🛑 Stopping current containers..."
docker compose -f docker-compose.production.yml down --remove-orphans

# Start new containers
echo "▶️  Starting containers..."
docker compose -f docker-compose.production.yml up -d --scale smsgangapp=1

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 15

# Clear application cache
echo "🧹 Clearing application cache..."
docker compose -f docker-compose.production.yml exec smsgangapp php artisan optimize:clear || true

# Cache new configuration
echo "💾 Caching application configuration..."
docker compose -f docker-compose.production.yml exec smsgangapp php artisan optimize

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.production.yml exec -T smsgangapp php artisan migrate --force

# Prune old Docker images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo ""
echo "✅ SMSGang Production Deployment Complete!"
echo ""
echo "📊 Services Status:"
docker compose -f docker-compose.production.yml ps
echo ""
echo "🌐 Application URLs:"
echo "   Backend:   https://smsgang.duckdns.org"
echo "   Admin:     https://admin-smsgang.duckdns.org"
echo "   PhpMyAdmin: http://157.173.127.226:5001"
echo "   Dozzle:    http://157.173.127.226:8086"
echo ""
