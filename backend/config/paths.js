const path = require("path");

module.exports = {
  uploadDir: path.join(__dirname, "..", "uploads"),
  transcriptDir: path.join(__dirname, "..", "transcripts"),
  streamDir: path.join(__dirname, "..", "uploads", "stream")
};

