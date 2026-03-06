const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { streamDir } = require("../config/paths");

const CONCAT_LIST = "concat_list.txt";
const MERGED_NAME = "merged.wav";

/** Resolve ffmpeg command for spawn (Windows: ffmpeg.exe, or use FFMPEG_PATH env). */
function getFfmpegCommand() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

/**
 * List audio files in session dir, sort by timestamp in filename (chunk_123.webm, stream_123.webm).
 */
function getSortedChunks(sessionPath) {
  if (!fs.existsSync(sessionPath)) return [];
  const files = fs.readdirSync(sessionPath);
  const audio = files.filter(
    (f) =>
      f.startsWith("chunk_") || f.startsWith("stream_")
  );
  return audio.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

/**
 * Merge all chunks in streamDir/<sessionId> with ffmpeg, output one WAV file.
 * Returns path to merged file, or rejects on error.
 */
function mergeSession(sessionId) {
  return new Promise((resolve, reject) => {
    const sessionPath = path.join(streamDir, sessionId);
    const chunks = getSortedChunks(sessionPath);

    if (chunks.length === 0) {
      return reject(new Error("No chunks to merge"));
    }

    const listPath = path.join(sessionPath, CONCAT_LIST);
    const mergedPath = path.join(sessionPath, MERGED_NAME);

    const listContent = chunks
      .map((f) => `file '${path.join(sessionPath, f).replace(/\\/g, "/")}'`)
      .join("\n");
    fs.writeFileSync(listPath, listContent, "utf8");

    const ffmpeg = spawn(
      getFfmpegCommand(),
      [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        mergedPath
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    ffmpeg.stderr.on("data", (d) => { stderr += d.toString(); });

    ffmpeg.on("close", (code) => {
      try { fs.unlinkSync(listPath); } catch (_) {}
      if (code !== 0) {
        return reject(new Error(`ffmpeg failed: ${stderr.slice(-500)}`));
      }
      resolve(mergedPath);
    });

    ffmpeg.on("error", (err) => {
      if (err.code === "ENOENT") {
        const cmd = getFfmpegCommand();
        reject(
          new Error(
            `ffmpeg not found (${err.code}). Install ffmpeg and add it to PATH, or set env FFMPEG_PATH to the full path to ffmpeg (e.g. C:\\ffmpeg\\bin\\ffmpeg.exe).`
          )
        );
      } else {
        reject(err);
      }
    });
  });
}

exports.mergeSession = mergeSession;
exports.getSortedChunks = getSortedChunks;
