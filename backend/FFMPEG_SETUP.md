# FFmpeg setup (Windows)

The `ffmpeg-8.0.1.tar` in Downloads is **source code**, not a ready-to-run Windows build. You need a build that includes `ffmpeg.exe`.

## 1. Download a Windows build

- **Essentials (smaller):** https://www.gyan.dev/ffmpeg/builds/ → `ffmpeg-release-essentials.zip`
- **Or:** https://github.com/BtbN/FFmpeg-Builds/releases → pick the latest `ffmpeg-master-latest-win64-gpl.zip`

## 2. Extract

- Unzip to a folder, e.g. `C:\ffmpeg` or `%USERPROFILE%\Downloads\ffmpeg`.
- You should see a `bin` folder with `ffmpeg.exe` inside.

**Example (your current path):**
`C:\Users\iamsa\Downloads\ffmpeg-8.0.1-essentials_build\ffmpeg-8.0.1-essentials_build\bin`

## 3. Point the backend to ffmpeg

From the **backend** folder, run the server with the full path to `ffmpeg.exe`:

**PowerShell (copy-paste for your path):**
```powershell
$env:FFMPEG_PATH = "C:\Users\iamsa\Downloads\ffmpeg-8.0.1-essentials_build\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe"
node server.js
```

**Or Cmd:**
```cmd
set FFMPEG_PATH=C:\Users\iamsa\Downloads\ffmpeg-8.0.1-essentials_build\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe
node server.js
```

## Optional: add to PATH

If you add the `bin` folder to your system PATH, you can run the server without setting `FFMPEG_PATH`:

1. Win + R → `sysdm.cpl` → Advanced → Environment Variables.
2. Under "User variables" or "System variables", edit `Path` → New → add the folder that contains `ffmpeg.exe` (e.g. `C:\ffmpeg\bin`).
3. Restart the terminal, then run `node server.js` from the backend folder.
