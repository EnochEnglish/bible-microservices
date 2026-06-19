# Bible Monolith — ECS Deployment Guide

## Architecture

```
Browser → Nginx (:80) → Static files (frontend/)
                       → /api/* → Monolith (:8080)
                                   ├── Text (Bible passages)
                                   ├── Search (Lucene)
                                   ├── Module (SWORD, management)
                                   ├── Auth (JWT, user management)
                                   └── Dictionary, Strong's, GenBook, etc.
```

**Single JVM process** — all 6 microservices merged into one Spring Boot app.

## Server Requirements

- **Memory**: 1 GiB minimum (recommended: 1.5 GiB)
- **Disk**: ~500 MB free (excluding data)
- **OS**: Linux (tested on Alibaba Cloud Linux 3)
- **Java**: JDK 17+
- **Nginx**: any recent version

## File Layout on Server

```
/opt/bible-microservices/
├── data/
│   ├── text-db.mv.db         # H2 database (Bible text + Strong's)
│   ├── auth-db.mv.db         # H2 database (auth/users)
│   ├── search-index/         # Lucene index
│   └── sword-mods/           # SWORD modules (JSword)
├── frontend/                 # Static HTML/JS/CSS
├── bible-monolith.jar        # The JAR file
├── start-monolith.sh         # Startup script
├── stop-monolith.sh          # Shutdown script
├── nginx-usebible.conf       # Nginx configuration
├── logs/                     # Application logs (or /tmp)
└── DEPLOY.md                 # This file
```

## Deployment Steps

### 1. Upload Files

```bash
# Upload JAR and scripts to server
scp bible-monolith.jar start-monolith.sh stop-monolith.sh ccscw@8.222.165.245:/opt/bible-microservices/
scp nginx-usebible.conf ccscw@8.222.165.245:/tmp/
scp -r frontend/* ccscw@8.222.165.245:/opt/bible-microservices/frontend/
```

### 2. Start the Monolith

```bash
cd /opt/bible-microservices
chmod +x start-monolith.sh stop-monolith.sh
bash start-monolith.sh
# Wait ~70 seconds for Spring Boot + JSword + Lucene index loading
```

### 3. Configure Nginx

```bash
# Stop old nginx
pkill nginx

# Apply new config
cp nginx-usebible.conf /etc/nginx/conf.d/usebible.conf
# Or directly: /etc/nginx/nginx.conf (if using single-server setup)

# Test and restart
nginx -t
nginx
```

### 4. Verify

```bash
# Health check
curl http://localhost:8080/actuator/health

# Bible endpoint (public)
curl http://localhost/api/v1/bible/kjv/Genesis/1

# SWORD modules
curl http://localhost/api/v1/sword/modules

# Auth captcha (public)
curl http://localhost/api/v1/auth/captcha

# Frontend
curl -I http://localhost/
```

## JVM Tuning

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `-Xms48m` | 48 MB min heap | Conservative start |
| `-Xmx160m` | 160 MB max heap | Fits 1 GiB server with:
| | | — H2 file cache (~100 MB off-heap) |
| | | — Lucene index mem (~50 MB) |
| | | — JSword module data (~30 MB) |
| | | — Nginx (~20 MB) |
| | | — OS overhead (~200 MB) |
| `-XX:+UseG1GC` | G1 collector | Low pause times |
| `-XX:MaxGCPauseMillis=200` | Max GC pause 200ms | Responsive API |

**Real memory usage**: ~250-350 MB RSS (Linux) for JVM process.
Add nginx ~20 MB + OS ~200 MB = ~500-550 MB total on 1.7 GiB server.

## Troubleshooting

### Port 8080 already in use
```bash
lsof -i :8080
kill -9 <PID>
```

### Nginx returns 502 Bad Gateway
Monolith is not running or still starting. Check:
```bash
tail -50 /tmp/bible-monolith/monolith.log
ps aux | grep java
```

### SWORD modules not showing
Check data directory:
```bash
ls /opt/bible-microservices/data/sword-mods/
# Each module needs: mods.d/ + modules/ subdirectories
```

### H2 database locked
Monolith already running. Only one process can access H2 at a time.
```bash
bash stop-monolith.sh
bash start-monolith.sh
```

## Updating

1. Build new JAR locally
2. Stop monolith: `bash stop-monolith.sh`
3. Upload new JAR: `scp bible-monolith.jar ccscw@8.222.165.245:/opt/bible-microservices/`
4. Start: `bash start-monolith.sh`

Data files are NOT affected by JAR updates.
