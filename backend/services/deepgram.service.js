const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

function createLiveConnection(onTranscript, onError) {
  if (!DEEPGRAM_API_KEY) {
    onError(new Error("DEEPGRAM_API_KEY not set in .env"));
    return null;
  }
  const deepgram = createClient(DEEPGRAM_API_KEY);
  const model = process.env.DEEPGRAM_MODEL || "nova-3";
  const language = process.env.DEEPGRAM_LANGUAGE || "hi";
  const live = deepgram.listen.live({
    model,
    language,
    encoding: "linear16",
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    punctuate: true
  });

  live.on(LiveTranscriptionEvents.Open, () => {});

  live.on(LiveTranscriptionEvents.Transcript, (data) => {
    try {
      const transcript =
        data?.channel?.alternatives?.[0]?.transcript ??
        data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      const isFinal = data?.speech_final ?? data?.is_final ?? false;
      if (transcript) {
        onTranscript(transcript, isFinal);
      }
    } catch (e) {
      onError(e);
    }
  });

  live.on(LiveTranscriptionEvents.Error, (err) => onError(err));
  live.on(LiveTranscriptionEvents.Close, () => {});

  return live;
}

function isConfigured() {
  return Boolean(DEEPGRAM_API_KEY);
}

module.exports = { createLiveConnection, isConfigured };
