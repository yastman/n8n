# Security & Production Guide

## Overview
Security and production deployment guide for the AI automation platform covering all components.

## Roadmap Tasks (9 Total)

### Security Implementation
1. **Implement API authentication and rate limiting**
2. **Set up SSL/TLS certificates for all services**
3. **Configure firewall and network security**
4. **Implement data encryption at rest and in transit**

### Production Deployment
5. **Set up Docker Compose production environment**
6. **Configure monitoring and alerting systems**
7. **Implement backup and disaster recovery**
8. **Set up CI/CD pipeline for deployments**
9. **Performance testing and optimization**

## API Security

### Authentication & Authorization
```javascript
// JWT-based authentication
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// API key validation
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}
```

### Input Validation & Sanitization
```javascript
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

// Request validation schemas
const searchSchema = Joi.object({
  query: Joi.string().min(1).max(500).required(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  threshold: Joi.number().min(0).max(1).default(0.7)
});

// Validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }
    req.body = value;
    next();
  };
}

// Content sanitization
function sanitizeContent(content) {
  return DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

## SSL/TLS Configuration

### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Data Encryption

### Database Encryption
```sql
-- Enable encryption at rest in PostgreSQL
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';

-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted storage function
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- Decryption function
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

### Application-Level Encryption
```javascript
const crypto = require('crypto');

class DataEncryption {
  constructor(key) {
    this.key = Buffer.from(key, 'hex');
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      this.key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Production Docker Compose

### Multi-Service Configuration
```yaml
version: '3.8'

services:
  redis:
    image: redis/redis-stack:8.2.1-v0
    restart: unless-stopped
    ports:
      - "6379:6379"
    environment:
      - REDIS_ARGS=--requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PROTOCOL=https
      - NODE_ENV=production
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
      - redis

  api:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - COHERE_API_KEY=${COHERE_API_KEY}
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api
      - n8n

volumes:
  redis_data:
  postgres_data:
  n8n_data:

networks:
  default:
    driver: bridge
```

## Monitoring & Alerting

### Health Check Endpoints
```javascript
// Health check middleware
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check Redis connection
    await redisClient.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check PostgreSQL connection
    await pgClient.query('SELECT 1');
    health.services.postgres = 'healthy';
  } catch (error) {
    health.services.postgres = 'unhealthy';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
```

### Prometheus Metrics
```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const searchRequests = new promClient.Counter({
  name: 'search_requests_total',
  help: 'Total number of search requests',
  labelNames: ['status']
});

// Metrics middleware
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
}
```

## Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash

# Backup script for production data
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/postgres_$DATE.sql"

# Redis backup
redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Compress backups
gzip "$BACKUP_DIR/postgres_$DATE.sql"
gzip "$BACKUP_DIR/redis_$DATE.rdb"

# Upload to cloud storage (AWS S3 example)
aws s3 cp "$BACKUP_DIR/" s3://your-backup-bucket/ --recursive --exclude "*" --include "*_$DATE.*.gz"

# Clean up old local backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

## Performance Targets

### SLA Metrics
- **API Response Time**: < 50ms (95th percentile)
- **Search Accuracy**: ≥ 85%
- **Cache Hit Rate**: ≥ 80%
- **System Uptime**: ≥ 99.99%
- **Error Rate**: < 0.1%

### Performance Testing
```javascript
// Load testing with k6
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 0 },
  ],
};

export default function() {
  let response = http.post('https://api.yourdomain.com/search', {
    query: 'test search query',
    limit: 10
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}
```