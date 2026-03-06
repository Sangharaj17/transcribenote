# Sync frontend to server

If the server's `frontend/` folder only has `package-lock.json`, the full frontend was never on the server. Use one of these:

---

## Option A: Push from local, then pull on server (recommended)

**1. On your Windows machine (in the crazy repo):**

Make sure the full frontend is committed and pushed:

```bash
cd G:\github\crazy
git status
git add frontend/
git add .
git commit -m "Add full frontend for deployment"
git push origin main
```

(Use `master` instead of `main` if that’s your default branch.)

**2. On the server:**

```bash
cd ~/projects/transcribenote
git pull origin main
ls frontend/
# You should see: app  next.config.mjs  package.json  package-lock.json  postcss.config.mjs  public  etc.
cd frontend
npm install
export NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site
npm run build
```

---

## Option B: Copy frontend from Windows to server (rsync / SCP)

If the remote doesn’t have the latest frontend (or you can’t push yet), copy it from your PC.

**From Windows (PowerShell or WSL), with the server’s IP and user:**

```bash
# Replace YOUR_SERVER_IP and sangharaj with your server user
scp -r frontend/* sangharaj@YOUR_SERVER_IP:~/projects/transcribenote/frontend/
```

Or with **rsync** (if you have it):

```bash
rsync -avz --exclude 'frontend/node_modules' --exclude 'frontend/.next' frontend/ sangharaj@YOUR_SERVER_IP:~/projects/transcribenote/frontend/
```

**Then on the server:**

```bash
cd ~/projects/transcribenote/frontend
npm install
export NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site
npm run build
```

---

## If you only need package.json to unblock npm

Create `frontend/package.json` on the server with:

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 9000"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "babel-plugin-react-compiler": "1.0.0",
    "tailwindcss": "^4"
  }
}
```

You still need the rest of the frontend (`app/`, `public/`, `next.config.mjs`, etc.) for the app to run, so prefer **Option A** or **Option B**.
