# Deployment Guide

This guide covers different ways to deploy NewsNest to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Traditional Deployment](#traditional-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Post-Deployment](#post-deployment)

## Prerequisites

- Node.js 18+ installed on the server
- SQLite3 or PostgreSQL database
- Web server (nginx recommended)
- SSL certificate for HTTPS
- Domain name (optional but recommended)

## Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lakkhitha/NewsNest-Dynamic-web.git
   cd NewsNest-Dynamic-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Build the application:**
   ```bash
   npm run build
   ```

## Deployment Options

### Option 1: Docker (Recommended)

NewsNest includes Docker support for easy deployment.

#### Using Docker Compose

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

#### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t newsnest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name newsnest \
     -p 4000:4000 \
     -v $(pwd)/data:/app/server/data \
     -v $(pwd)/uploads:/app/server/uploads \
     -e NODE_ENV=production \
     newsnest
   ```

### Option 2: Traditional Deployment

#### Manual Setup

1. **Install Node.js and npm on your server**

2. **Install PM2 for process management:**
   ```bash
   npm install -g pm2
   ```

3. **Start the application:**
   ```bash
   pm2 start npm --name "newsnest" -- run start
   pm2 save
   pm2 startup
   ```

4. **Configure nginx (example config):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       location /uploads/ {
           alias /path/to/your/uploads/;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

### Option 3: Cloud Deployment

#### Vercel (Frontend Only)

1. **Connect your GitHub repository to Vercel**

2. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`

3. **Set environment variables in Vercel dashboard**

#### Railway

1. **Connect your GitHub repository**

2. **Railway will automatically detect and deploy the application**

3. **Set environment variables in Railway dashboard**

#### DigitalOcean App Platform

1. **Create a new app from GitHub**

2. **Configure the app:**
   - Source: GitHub repository
   - Environment: Node.js
   - Build Command: `npm run build`
   - Run Command: `npm start`

#### AWS

##### EC2 Instance

1. **Launch an EC2 instance with Ubuntu**

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and deploy:**
   ```bash
   git clone https://github.com/Lakkhitha/NewsNest-Dynamic-web.git
   cd NewsNest-Dynamic-web
   npm install
   npm run build
   npm install -g pm2
   pm2 start npm --name "newsnest" -- run start
   ```

##### AWS Lightsail

1. **Create a Lightsail instance**

2. **Follow the EC2 deployment steps**

##### AWS Elastic Beanstalk

1. **Create an application**

2. **Deploy using EB CLI:**
   ```bash
   eb init
   eb create production-env
   ```

## Post-Deployment

### Database Setup

1. **Initialize the database:**
   The application will automatically create tables and seed data on first run.

2. **Backup strategy:**
   ```bash
   # SQLite backup (run daily via cron)
   cp data/newsnest.sqlite data/backup-$(date +%Y%m%d).sqlite
   ```

### SSL Configuration

#### Let's Encrypt (Free SSL)

1. **Install certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal:**
   Certbot sets up automatic renewal by default.

### Monitoring

#### PM2 Monitoring

```bash
pm2 monit
```

#### Application Monitoring

Add health check endpoint monitoring:
- URL: `https://your-domain.com/api/health`
- Expected response: `{"ok": true, "app": "NewsNest"}`

### Performance Optimization

1. **Enable gzip compression in nginx:**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **Set up caching:**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Database optimization:**
   - Regular VACUUM operations for SQLite
   - Monitor query performance
   - Add indexes for frequently queried columns

### Security Checklist

- [ ] Change default JWT secret
- [ ] Use HTTPS in production
- [ ] Set secure cookies
- [ ] Implement rate limiting
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor for vulnerabilities
- [ ] Use environment variables for secrets

### Backup Strategy

#### Automated Backups

```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# Database backup
sqlite3 data/newsnest.sqlite ".backup '${BACKUP_DIR}/newsnest-${DATE}.sqlite'"

# Uploads backup
tar -czf "${BACKUP_DIR}/uploads-${DATE}.tar.gz" uploads/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

#### Cron Job Setup

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Troubleshooting

#### Common Issues

1. **Port already in use:**
   ```bash
   sudo lsof -i :4000
   sudo kill -9 <PID>
   ```

2. **Database connection issues:**
   - Check file permissions on data directory
   - Ensure SQLite is installed
   - Verify database file exists

3. **Memory issues:**
   ```bash
   pm2 monit
   pm2 reload newsnest
   ```

4. **SSL certificate issues:**
   ```bash
   sudo certbot certificates
   sudo certbot renew
   ```

### Scaling Considerations

For high-traffic deployments:

1. **Load Balancing:** Use nginx or cloud load balancers
2. **Database:** Consider PostgreSQL for better concurrency
3. **Caching:** Implement Redis for session and data caching
4. **CDN:** Use Cloudflare or AWS CloudFront for static assets
5. **Monitoring:** Set up comprehensive logging and alerting

### Support

For deployment issues:
- Check the application logs: `pm2 logs newsnest`
- Review nginx error logs: `/var/log/nginx/error.log`
- Verify environment variables are set correctly
- Test API endpoints: `curl http://localhost:4000/api/health`