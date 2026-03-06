# Sync client to server (VPS uses /client not /frontend)

If the server's `client/` folder only has `package-lock.json`, the **full client code is missing** (package.json, app/, public/, etc.). Env alone is not enough — you must get the full client onto the VPS first, then add client env.

---

## Option A: Push from local, then pull on server (recommended)

**1. On your Windows machine (in the crazy repo):**

Make sure the full client is committed and pushed:

```bash
cd G:\github\crazy
git status
git add client/
git add .
git commit -m "Add full client for deployment"
git push origin main
```

(Use `master` instead of `main` if that's your default branch.)

**2. On the VPS:**

```bash
cd ~/projects/transcribenote
git pull origin main
ls client/
# You should see: app  next.config.mjs  package.json  package-lock.json  postcss.config.mjs  public  etc.
cd client
npm install
# Create client env on VPS so you don't need to export every time
echo "NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site" > .env.local
npm run build
pm2 restart transcribenote-web
```

---

## Option B: Copy client from Windows to server (rsync / SCP)

If the remote doesn't have the latest client (or you can't push yet), copy it from your PC.

**From Windows (PowerShell or WSL), with the server's IP and user:**

```bash
# Replace YOUR_SERVER_IP and sangharaj with your server user
scp -r client/* sangharaj@YOUR_SERVER_IP:~/projects/transcribenote/client/
```

Or with **rsync** (if you have it):

```bash
rsync -avz --exclude 'client/node_modules' --exclude 'client/.next' client/ sangharaj@YOUR_SERVER_IP:~/projects/transcribenote/client/
```

**Then on the VPS:**

```bash
cd ~/projects/transcribenote/client
echo "NEXT_PUBLIC_API_URL=https://api.transcribe.scrollverse.site" > .env.local
npm install
npm run build
pm2 restart transcribenote-web
```

---

## If you only need package.json to unblock npm

Create `client/package.json` on the server with:

```json
{
  "name": "client",
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

You still need the rest of the client (`app/`, `public/`, `next.config.mjs`, etc.) for the app to run, so prefer **Option A** or **Option B**.
