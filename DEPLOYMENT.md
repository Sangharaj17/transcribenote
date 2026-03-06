# TranscribeNote – Full server deployment guide

Complete step-by-step process for hosting on Linux (Ubuntu/Debian).

**Domains:**
- Frontend: **transcribe.scrollverse.site** (port 9000)
- Backend: **api.transcribe.scrollverse.site** (port 9001)

---

## 1. Install system dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # v20.x
npm -v

# FFmpeg (for merging audio chunks)
sudo apt install -y ffmpeg
which ffmpeg   # e.g. /usr/bin/ffmpeg

# Python 3 and pip (for Whisper transcription)
sudo apt install -y python3 python3-pip python3-venv
# On Debian/Ubuntu, if venv creation fails, install the versioned package (use your python3 version):
# sudo apt install -y python3.12-venv
python3 --version
```

---

## 2. Install Whisper (Python)

```bash
# If "ensurepip is not available" or venv creation failed, install the venv package for your Python version:
sudo apt install -y python3.12-venv
# Or for Python 3.11: sudo apt install -y python3.11-venv

# Create virtual environment
python3 -m venv ~/whisper-venv
source ~/whisper-venv/bin/activate

# Install Whisper
pip install openai-whisper

# Test
whisper --help
deactivate
```

Note the Python path: `~/whisper-venv/bin/python` (e.g. `/home/sangharaj/whisper-venv/bin/python`).

---

## 3. Get the project

```bash
cd ~/projects
# If not cloned yet:
# git clone <your-repo-url> transcribenote
cd transcribenote

# Pull latest
git pull origin main
```

Ensure you have:

- `backend/` – server.js, config/, controllers/, etc.
- `client/` – app/, public/, package.json, next.config.mjs, etc. (Next.js app on VPS)

---

## 4. Backend setup

```bash
cd ~/projects/transcribenote/backend

# Install dependencies
npm install

# Create .env (copy from example and fill)
cp .env.example .env
nano .env
```

**Required in `backend/.env`:**

- `SUPABASE_URL` – e.g. `https://xxxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` – from Supabase Dashboard → Settings → API → service_role
- `JWT_SECRET` – long random string (e.g. `openssl rand -hex 32`)
- `DEEPGRAM_API_KEY` – from https://deepgram.com
- `FFMPEG_PATH` – e.g. `/usr/bin/ffmpeg` (run `which ffmpeg`)
- `WHISPER_PATH` – e.g. `/home/sangharaj/whisper-venv/bin/python`

**Optional:** `PORT=9001` (default is already 9001).

**Test backend:**

```bash
npm start
# In another terminal:
curl http://localhost:9001/api/health
# Should return {"ok":true}
# Stop with Ctrl+C
```

---

## 5. Client setup (Next.js app on VPS)

```bash
cd ~/projects/transcribenote/client

# Install dependencies
npm install

# Client env on VPS (so API URL is set for build; no need to export each time)
echo "NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site" > .env.local

# Build (reads NEXT_PUBLIC_API_URL from .env.local)
npm run build
```

**Test client:**

```bash
npm start
# Opens on port 9000
# Visit http://localhost:9000 (or your server IP:9000)
# Stop with Ctrl+C
```

---

## 6. Run with PM2 (production)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend
cd ~/projects/transcribenote/backend
pm2 start server.js --name transcribenote-api

# Start client (Next.js on port 9000)
cd ~/projects/transcribenote/client
# Ensure .env.local exists: NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site
pm2 start npm --name transcribenote-web -- start

# Save process list so it restarts on reboot
pm2 save
pm2 startup
# Run the command it prints (sudo env PATH=...)

# Useful commands
pm2 status
pm2 logs transcribenote-api
pm2 logs transcribenote-web
pm2 restart transcribenote-api
pm2 restart transcribenote-web
```

---

## 7. Install and configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Copy config from repo
sudo cp ~/projects/transcribenote/nginx-transcribenote.conf /etc/nginx/sites-available/transcribenote

# Enable site
sudo ln -sf /etc/nginx/sites-available/transcribenote /etc/nginx/sites-enabled/

# Remove default site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. DNS (before domains work)

Add these records in your DNS provider (e.g. Cloudflare, Namecheap):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | transcribe | YOUR_SERVER_IP | 300 |
| A | api.transcribe | YOUR_SERVER_IP | 300 |

Or if using subdomains:
- `transcribe.scrollverse.site` → your server IP
- `api.transcribe.scrollverse.site` → your server IP

Wait for DNS propagation (a few minutes to hours).

---

## 9. Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (Nginx)
sudo ufw allow 443   # HTTPS (if using SSL later)
sudo ufw enable
sudo ufw status
```

---

## 10. SSL (HTTPS) with Let's Encrypt (optional)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates (Nginx must be running, DNS must point to server)
sudo certbot --nginx -d transcribe.scrollverse.site -d api.transcribe.scrollverse.site

# Follow prompts
# Certbot will auto-update nginx config for HTTPS

# Auto-renewal (usually already set up)
sudo certbot renew --dry-run
```

After SSL, update `client/.env.local` or rebuild with:

```bash
cd ~/projects/transcribenote/client
echo "NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site" > .env.local
npm run build
pm2 restart transcribenote-web
```

---

## 11. Supabase tables

Ensure the database has the schema. In Supabase Dashboard → SQL Editor, run:

- `backend/scripts/init_db.sql` (creates users and transcripts tables)

---

## 12. Checklist

| Step | What |
|------|------|
| 1 | Node 20, FFmpeg, Python 3, pip |
| 2 | Whisper in venv; note Python path |
| 3 | Full repo cloned |
| 4 | Backend: npm install, .env with Supabase, JWT, Deepgram, FFMPEG_PATH, WHISPER_PATH |
| 5 | Client: npm install, .env.local with NEXT_PUBLIC_API_URL, npm run build |
| 6 | PM2: transcribenote-api, transcribenote-web; pm2 save; pm2 startup |
| 7 | Nginx: copy config, enable, reload |
| 8 | DNS: A records for transcribe.scrollverse.site and api.transcribe.scrollverse.site |
| 9 | Firewall: 22, 80, 443 |
| 10 | SSL: certbot (optional) |
| 11 | Supabase: run init_db.sql |

---

## 13. Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't start | `pm2 logs transcribenote-api` – check .env and Supabase keys |
| ffmpeg not found | Set `FFMPEG_PATH=/usr/bin/ffmpeg` in .env |
| Whisper not found | Set `WHISPER_PATH=/home/sangharaj/whisper-venv/bin/python` |
| Frontend build fails | Ensure client has app/, public/, package.json |
| Frontend shows wrong API | Rebuild with NEXT_PUBLIC_API_URL in client/.env.local |
| 502 Bad Gateway | Check PM2: `pm2 status` – both processes should be "online" |
| WebSocket fails | Ensure Nginx has `proxy_set_header Upgrade` and `Connection "upgrade"` |
| CORS errors | Backend allows `*`; ensure client uses correct API URL |

---

## 14. Ports summary

| Service | Port | Domain |
|---------|------|--------|
| Client (Next.js) | 9000 | transcribe.scrollverse.site |
| Backend (API + WebSocket) | 9001 | api.transcribe.scrollverse.site |
