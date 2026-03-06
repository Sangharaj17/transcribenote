const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const { transcriptDir } = require("../config/paths");

/** Python command or full path (pip install openai-whisper). WHISPER_PATH = full path, WHISPER_CMD = command name. */
function getWhisperCommand() {
  if (process.env.WHISPER_PATH) return process.env.WHISPER_PATH;
  if (process.env.WHISPER_CMD) return process.env.WHISPER_CMD;
  return process.platform === "win32" ? "py" : "python3";
}

/** Build env for child so Whisper (Python) can find ffmpeg when it runs it internally. */
function getWhisperEnv() {
  const env = { ...process.env };
  const ffmpegPath = process.env.FFMPEG_PATH || process.env.FFMPEG_BIN;
  if (ffmpegPath) {
    const ffmpegDir = path.dirname(ffmpegPath);
    const sep = process.platform === "win32" ? ";" : ":";
    env.PATH = `${ffmpegDir}${sep}${env.PATH || ""}`;
  }
  return env;
}

/**
 * @param {string} audioPath - path to audio file
 * @param {string} [outputDir] - optional; if set, whisper writes .txt here and we read from here
 */
exports.transcribe = (audioPath, outputDir) => {
  const outDir = outputDir || transcriptDir;
  return new Promise((resolve, reject) => {
    const pythonCmd = getWhisperCommand();
    const whisper = spawn(
      pythonCmd,
      [
        "-m",
        "whisper",
        audioPath,
        "--model",
        "base",
        "--output_format",
        "txt",
        "--output_dir",
        outDir,
        "--initial_prompt",
        "Transcribe accurately in English, Hindi, Marathi or Hinglish. Do not use filler or default phrases."
      ],
      { env: getWhisperEnv() }
    );

    whisper.on("error", (err) => {
      if (err.code === "ENOENT") {
        const cmd = getWhisperCommand();
        reject(
          new Error(
            `Whisper not found. On the server set WHISPER_PATH to the full path to Python (e.g. /home/user/whisper-venv/bin/python) and ensure openai-whisper is installed. Tried: ${cmd}`
          )
        );
      } else {
        reject(err);
      }
    });

    whisper.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    whisper.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error("Whisper process failed"));
      }

      const base = path.basename(audioPath);
      const stem = path.basename(audioPath, path.extname(audioPath));
      const candidates = [
        path.join(outDir, stem + ".txt"),
        path.join(outDir, base + ".txt")
      ];
      let transcriptPath = candidates.find((p) => fs.existsSync(p));

      if (!transcriptPath) {
        return reject(
          new Error("Whisper did not produce a transcript file (checked " + candidates.map((p) => path.basename(p)).join(", ") + ")")
        );
      }

      try {
        const text = fs.readFileSync(transcriptPath, "utf8");
        resolve(text);
      } catch (err) {
        reject(err);
      }
    });
  });
};

