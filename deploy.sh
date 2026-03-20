#!/bin/bash

##############################################################################
#                     SMS GANG PRODUCTION DEPLOYMENT SCRIPT
#
# This script automates the entire VPS setup for SMS Gang production
# Usage: bash deploy.sh
#
##############################################################################

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_PATH="/opt/smsgang"
BACKEND_PATH="$PROJECT_PATH/backend"
GITHUB_REPO="https://github.com/yourusername/smsgang.git"  # CHANGE THIS
DOMAIN="smsgang.com"
DB_NAME="smsgang"
DB_USER="smsgang"
DB_PASSWORD=""
REDIS_PASSWORD=""

##############################################################################
# Helper Functions
##############################################################################

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

##############################################################################
# STEP 1: System Updates
##############################################################################

step_system_updates() {
    print_info "Step 1: Updating system packages..."
    apt update && apt upgrade -y
    apt install -y curl wget git htop net-tools cron mysql-client
    print_success "System updated"
}

##############################################################################
# STEP 2: Install Docker
##############################################################################

step_install_docker() {
    print_info "Step 2: Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_warning "Docker already installed: $(docker --version)"
    else
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker root
        print_success "Docker installed"
    fi

    if command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose already installed"
    else
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed"
    fi
}

##############################################################################
# STEP 3: Install MySQL
##############################################################################

step_install_mysql() {
    print_info "Step 3: Installing MySQL Server..."
    
    if command -v mysql &> /dev/null; then
        print_warning "MySQL already installed"
    else
        DEBIAN_FRONTEND=noninteractive apt install -y mysql-server
        systemctl enable mysql
        systemctl start mysql
        print_success "MySQL installed and started"
    fi

    # Generate secure password if not provided
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(generate_password)
        print_warning "Generated DB password: $DB_PASSWORD (SAVE THIS SECURELY)"
    fi

    # Store password for backup automation
    echo "$DB_PASSWORD" > /root/.mysql_password
    chmod 600 /root/.mysql_password

    # Create database and user
    print_info "Creating database and user..."
    mysql -u root << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
MYSQL_SCRIPT
    
    print_success "Database created: $DB_NAME"
    print_success "Database user created: $DB_USER"
}

##############################################################################
# STEP 4: Clone Project
##############################################################################

step_clone_project() {
    print_info "Step 4: Cloning SMS Gang repository..."
    
    if [ -d "$PROJECT_PATH" ]; then
        print_warning "Project directory already exists, pulling latest changes..."
        cd "$PROJECT_PATH"
        git pull origin main
    else
        mkdir -p /opt
        git clone "$GITHUB_REPO" "$PROJECT_PATH"
        print_success "Repository cloned"
    fi
}

##############################################################################
# STEP 5: Create Environment Files
##############################################################################

step_create_env_files() {
    print_info "Step 5: Creating environment configuration..."
    
    if [ -z "$REDIS_PASSWORD" ]; then
        REDIS_PASSWORD=$(generate_password)
    fi

    cd "$BACKEND_PATH"

    # Create .env file for Docker
    cat > .env << ENV_FILE
APP_NAME=SMSGang
APP_ENV=production
APP_DEBUG=false
APP_KEY=
APP_URL=https://$DOMAIN

LOG_CHANNEL=telegram
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD

BROADCAST_CONNECTION=log
CACHE_STORE=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_CLIENT=predis
REDIS_HOST=localhost
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

FRONTEND_URL=https://$DOMAIN
ADMIN_URL=https://admin.$DOMAIN

FIVESIM_API_KEY=
LENDOVERIFY_API_KEY=
LENDOVERIFY_BASE_URL=https://api.lendoverify.com
CURRENCY_API_KEY=
CURRENCY_API_HOST=api.exchangerate-api.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ENV_FILE

    print_success "Created .env file"
    
    # Create .env.docker for environment variables
    cat > .env.docker << DOCKER_ENV
APP_PORT=9000
APP_HOST=0.0.0.0
FORWARD_DB_PORT=3306
FORWARD_REDIS_PORT=6379

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
DOCKER_ENV

    print_success "Created .env.docker file"
}

##############################################################################
# STEP 6: Setup MySQL Backups
##############################################################################

step_setup_backups() {
    print_info "Step 6: Setting up MySQL automated backups..."
    
    mkdir -p /backups/mysql
    chmod 700 /backups/mysql

    # Create backup script
    cat > /usr/local/bin/backup-mysql.sh << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smsgang_$DATE.sql.gz"

mysqldump -u root -p$(cat /root/.mysql_password) smsgang | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE" >> /var/log/mysql-backup.log
BACKUP_SCRIPT

    chmod +x /usr/local/bin/backup-mysql.sh

    # Setup daily cron job (2 AM)
    (crontab -l 2>/dev/null || true) | grep -v "backup-mysql.sh" | crontab -
    echo "0 2 * * * /usr/local/bin/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1" | crontab -

    print_success "MySQL backups scheduled daily at 2 AM"
}

##############################################################################
# STEP 7: Build and Start Containers
##############################################################################

step_docker_setup() {
    print_info "Step 7: Building Docker containers..."
    
    cd "$BACKEND_PATH"

    # Create required directories
    mkdir -p ./storage/{app,framework/cache,framework/sessions,framework/views,logs}
    mkdir -p ./bootstrap/cache
    chmod -R 755 ./storage ./bootstrap/cache

    # Build Docker image
    docker-compose build --no-cache app

    # Start containers
    docker-compose -f docker-compose.prod.yml up -d

    print_success "Docker containers started"
    
    # Wait for containers to be ready
    print_info "Waiting for services to be ready..."
    sleep 10

    # Run migrations
    print_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T app php artisan migrate --force || true

    # Clear caches
    docker-compose -f docker-compose.prod.yml exec -T app php artisan cache:clear || true
    docker-compose -f docker-compose.prod.yml exec -T app php artisan config:cache || true

    print_success "Containers configured and running"
}

##############################################################################
# STEP 8: SSL Configuration (Optional)
##############################################################################

step_ssl_setup() {
    print_info "Step 8: Setting up SSL with Let's Encrypt..."
    
    if [ -z "$DOMAIN" ]; then
        print_warning "Skipping SSL setup (domain not provided)"
        return
    fi

    apt install -y certbot python3-certbot-nginx

    # Generate certificate
    certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
        --non-interactive --agree-tos --email admin@$DOMAIN || print_warning "SSL certificate setup failed or already exists"

    # Enable auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer

    print_success "SSL certificate installed with auto-renewal"
}

##############################################################################
# STEP 9: Verification
##############################################################################

step_verify_installation() {
    print_info "Step 9: Verifying installation..."
    
    cd "$BACKEND_PATH"

    echo ""
    print_info "Docker containers status:"
    docker-compose -f docker-compose.prod.yml ps

    echo ""
    print_info "Health check:"
    if curl -f http://localhost/health 2>/dev/null | grep -q '{'; then
        print_success "Application is healthy"
    else
        print_warning "Health check returned no response (wait a moment for services to fully start)"
    fi

    echo ""
    print_success "Installation complete!"
}

##############################################################################
# STEP 10: Credentials Summary
##############################################################################

step_credentials_summary() {
    print_info "Step 10: Saving credentials..."
    
    cat > /root/smsgang-credentials.txt << CREDS
=============================================================================
                       SMS GANG PRODUCTION CREDENTIALS
=============================================================================

MySQL Database
--------------
Host: localhost
Database: $DB_NAME
Username: $DB_USER
Password: $DB_PASSWORD
Backup Location: /backups/mysql/

Redis Cache
-----------
Host: localhost
Port: 6379
Password: $REDIS_PASSWORD

Project Path
------------
Backend: $BACKEND_PATH
Repository: $GITHUB_REPO

Useful Commands
---------------
View logs:        docker-compose -f docker-compose.prod.yml logs -f
View web UI:      http://your-vps-ip:9001 (Dozzle)
View API docs:    http://your-vps-ip:9002 (Swagger)
Restart services: docker-compose -f docker-compose.prod.yml restart
Backup database:  /usr/local/bin/backup-mysql.sh

IMPORTANT: Save these credentials in a secure location!
IMPORTANT: Keep backups of /backups/mysql/ directory regularly!

=============================================================================
CREDS

    chmod 600 /root/smsgang-credentials.txt
    print_success "Credentials saved to /root/smsgang-credentials.txt"
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_info "=========================================="
    print_info " SMS Gang Production Deployment Script"
    print_info "=========================================="
    echo ""

    check_root

    print_warning "This script will set up a complete production environment."
    print_warning "Make sure you have configured the GITHUB_REPO variable!"
    echo ""
    read -p "Continue with installation? (yes/no) " -n 3 -r
    echo
    if [[ ! $REPLY =~ ^[Yy] ]]; then
        print_error "Installation cancelled"
        exit 1
    fi

    echo ""
    step_system_updates
    echo ""
    
    step_install_docker
    echo ""
    
    step_install_mysql
    echo ""
    
    step_clone_project
    echo ""
    
    step_create_env_files
    echo ""
    
    step_setup_backups
    echo ""
    
    step_docker_setup
    echo ""
    
    step_ssl_setup
    echo ""
    
    step_verify_installation
    echo ""
    
    step_credentials_summary
    echo ""

    print_success "=========================================="
    print_success " Production deployment completed! 🎉"
    print_success "=========================================="
    print_info "Next steps:"
    print_info "1. Update FIVESIM_API_KEY, LENDOVERIFY credentials in .env"
    print_info "2. Update TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"
    print_info "3. Run: cd $BACKEND_PATH && docker-compose restart"
    print_info "4. Check credentials: cat /root/smsgang-credentials.txt"
    print_info "5. Access logs: http://your-vps-ip:9001"
    echo ""
}

main "$@"
