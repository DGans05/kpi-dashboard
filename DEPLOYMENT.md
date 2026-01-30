# Production Deployment Guide

This guide covers deploying the KPI Dashboard to a production server.

## Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended)
- Docker and Docker Compose installed
- Domain name configured with DNS pointing to your server
- SSL certificate (Let's Encrypt recommended)

## Server Setup

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone <repository-url> kpi-dashboard
sudo chown -R $USER:$USER kpi-dashboard
cd kpi-dashboard
```

### 3. Configure Environment

```bash
# Copy production template
cp .env.production.example .env.production

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"

# Edit configuration
nano .env.production
```

Update the following values:
- `POSTGRES_PASSWORD` - Strong random password
- `JWT_SECRET` - Use the generated value above
- `NEXT_PUBLIC_API_URL` - Your API domain (e.g., `https://api.yourdomain.com`)
- `FRONTEND_URL` - Your frontend domain (e.g., `https://yourdomain.com`)

### 4. Configure Nginx

Create Nginx directory:

```bash
mkdir -p nginx/ssl
```

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:4000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # Frontend
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Backend API
    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 5. SSL Certificate (Let's Encrypt)

Install Certbot and obtain certificate:

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate (stop nginx first)
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates to nginx folder
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl
```

Set up auto-renewal:

```bash
# Add to crontab
echo "0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/kpi-dashboard/nginx/ssl/ && docker-compose -f /opt/kpi-dashboard/docker-compose.prod.yml restart nginx" | sudo tee -a /var/spool/cron/crontabs/root
```

## Deployment

### Start Services

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Verify Deployment

1. Check health endpoint: `curl https://api.yourdomain.com/health`
2. Access frontend: `https://yourdomain.com`
3. Login with admin credentials

## Database Management

### Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U kpiuser kpi_dashboard > backup_$(date +%Y%m%d).sql

# Automated daily backups (add to crontab)
0 2 * * * cd /opt/kpi-dashboard && docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U kpiuser kpi_dashboard > /opt/backups/kpi_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
# Restore from backup
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U kpiuser kpi_dashboard
```

## Updating

### Update Application

```bash
cd /opt/kpi-dashboard

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up old images
docker image prune -f
```

### Rolling Update (Zero Downtime)

```bash
# Update one service at a time
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend
```

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### System Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify environment
docker-compose -f docker-compose.prod.yml config
```

### Database Connection Issues

```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U kpiuser -d kpi_dashboard
```

### SSL Certificate Issues

```bash
# Verify certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
certbot certificates
```

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong database password
- [ ] Configure firewall (allow only 80, 443)
- [ ] Enable automatic security updates
- [ ] Set up SSL certificate auto-renewal
- [ ] Configure backup strategy
- [ ] Review audit logs regularly

## Support

For issues and questions:
1. Check the logs for error messages
2. Review the README.md troubleshooting section
3. Open a GitHub issue with relevant logs and configuration (without secrets)
