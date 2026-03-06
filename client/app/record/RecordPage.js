"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";
const CHUNK_MS = 2000; // send audio to server every 2s
const SAMPLE_RATE = 16000;

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 }
  }
};

function getWsUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";
  const wsBase = base.replace(/^http/, "ws").replace(/\/$/, "");
  return `${wsBase}/live`;
}

/** Live transcription via Deepgram (works in any browser). Sends PCM over WebSocket. */
function useDeepgramLive() {
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const processorRef = useRef(null);

  const start = useCallback(async () => {
    setLiveError(null);
    setFinalTranscript("");
    setInterimTranscript("");
    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = async () => {
      setIsLive(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
        contextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const bufferSize = 4096;
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(pcm.buffer);
        };
        source.connect(processor);
        processor.connect(ctx.destination);
      } catch (err) {
        console.error(err);
        setLiveError("Microphone access denied");
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setLiveError(data.error);
          return;
        }
        if (data.transcript) {
          if (data.isFinal) {
            setFinalTranscript((prev) => (prev ? prev + " " + data.transcript : data.transcript));
            setInterimTranscript("");
          } else {
            setInterimTranscript(data.transcript);
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => setLiveError("Live connection failed");
    ws.onclose = (event) => {
      setIsLive(false);
      if (event.code === 1011) {
        setLiveError("Add DEEPGRAM_API_KEY to backend .env for live transcription");
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (processorRef.current && contextRef.current) {
      try {
        processorRef.current.disconnect();
        contextRef.current.close();
      } catch (_) {}
      processorRef.current = null;
      contextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setInterimTranscript("");
    setIsLive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const liveTranscript = finalTranscript + (interimTranscript ? " " + interimTranscript : "");
  return { liveTranscript, finalTranscript, interimTranscript, isLive, liveError, start, stop };
}

function useAudioStreamToServer(sessionId, token) {
  const [streaming, setStreaming] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const startStreaming = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size === 0) return;
        try {
          const form = new FormData();
          form.append("chunk", e.data);
          form.append("sessionId", sessionId);
          const headers = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          await fetch(`${API_BASE}/api/stream-audio`, {
            method: "POST",
            headers,
            body: form,
          });
        } catch (err) {
          console.error("Failed to send audio chunk:", err);
        }
      };

      recorder.start(CHUNK_MS);
      setStreaming(true);
    } catch (err) {
      console.error("getUserMedia failed:", err);
    }
  }, [sessionId, token]);

  const stopStreaming = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { startStreaming, stopStreaming, streaming };
}

export default function RecordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(t || "");
    setSessionId(
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`
    );
  }, []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted && !localStorage.getItem("token")) {
      router.replace("/login");
    }
  }, [mounted, router]);

  const { liveTranscript, finalTranscript, interimTranscript, isLive, liveError, start: startLive, stop: stopLive } = useDeepgramLive();
  const { startStreaming, stopStreaming, streaming } = useAudioStreamToServer(sessionId, token);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [serverTranscript, setServerTranscript] = useState("");
  const [finishError, setFinishError] = useState(null);

  const start = useCallback(() => {
    setServerTranscript("");
    setFinishError(null);
    startLive();
    startStreaming();
    setRecording(true);
  }, [startLive, startStreaming]);

  const stop = useCallback(async () => {
    stopLive();
    stopStreaming();
    setRecording(false);
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/finish-stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      });
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const err = await res.json();
          setServerTranscript("");
          setFinishError(err?.error || res.statusText);
          return;
        } else {
          setServerTranscript("");
          setFinishError(`Server error ${res.status}`);
          return;
        }
      }
      setFinishError(null);
      if (!contentType?.includes("application/json")) {
        setServerTranscript("");
        console.error("Response was not JSON");
        return;
      }
      const data = await res.json();
      if (data.success && data.transcript) setServerTranscript(data.transcript);
    } catch (e) {
      console.error(e);
      setServerTranscript("");
      setFinishError("Request failed. Check backend and try again.");
    } finally {
      setProcessing(false);
    }
  }, [sessionId, token, stopLive, stopStreaming]);

  if (mounted && !token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <Link href="/record" className="text-xl font-semibold text-white">
          TranscribeNote
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/profile"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            My recordings
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/");
            }}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              New note
            </h1>
            <p className="text-zinc-400 text-sm">
              Live transcription in English, Hindi, Marathi & Hinglish. Speak clearly for at least 2 seconds.
            </p>
          </div>

          {(finishError || liveError) && (
            <div className="rounded-xl bg-amber-900/30 border border-amber-700 text-amber-200 px-4 py-3 text-sm">
              {finishError || liveError}
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              disabled={!sessionId}
              onClick={recording ? stop : start}
              className={`rounded-xl px-8 py-3.5 text-sm font-medium transition-all ${
                recording
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:pointer-events-none"
              }`}
            >
              {recording ? "Stop" : "Start recording"}
            </button>
          </div>

          {(recording || liveTranscript || serverTranscript || processing) && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-5 min-h-[160px] space-y-3">
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                {recording && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live
                  </span>
                )}
                {processing && !recording && (
                  <span className="inline-flex items-center gap-1.5">
                    Processing…
                  </span>
                )}
                {serverTranscript && !recording && (
                  <span className="text-indigo-400">Saved</span>
                )}
              </div>
              <div className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed min-h-[2.5rem]">
                {recording && (
                  <>
                    {finalTranscript && <span>{finalTranscript}</span>}
                    {interimTranscript && (
                      <span className="text-zinc-500 italic">{interimTranscript}</span>
                    )}
                    {!finalTranscript && !interimTranscript && (
                      <span className="text-zinc-500">Listening…</span>
                    )}
                  </>
                )}
                {!recording && serverTranscript && <span>{serverTranscript}</span>}
                {!recording && !serverTranscript && (processing || liveTranscript) && (
                  <>
                    {liveTranscript && <span className="text-zinc-500">{liveTranscript}</span>}
                    {processing && (
                      <span className="block mt-2 text-zinc-500 text-xs">Merging & transcribing…</span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
