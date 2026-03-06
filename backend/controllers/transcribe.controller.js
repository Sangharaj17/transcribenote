const whisperService = require("../services/whisper.service");

exports.transcribeAudio = async (req, res) => {
  try {
    const audioPath = req.file.path;

    const transcript = await whisperService.transcribe(audioPath);

    res.json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Transcription failed"
    });
  }
};

