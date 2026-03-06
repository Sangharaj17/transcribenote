"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function formatDate(isoString) {
  const d = new Date(isoString);
  try {
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    // Fallback for older runtimes that don't support dateStyle/timeStyle
    return d.toLocaleString();
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(t || "");
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) setNotes(data.notes);
        else setError(data.error || "Failed to load recordings");
      })
      .catch(() => setError("Connection failed"))
      .finally(() => setLoading(false));
  }, [token]);

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
            href="/record"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Record
          </Link>
          <Link
            href="/profile"
            className="text-sm text-indigo-400 font-medium"
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

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-6">
          My recordings
        </h1>

        {loading && (
          <p className="text-zinc-400 text-sm">Loading recordings…</p>
        )}

        {error && (
          <div className="rounded-xl bg-amber-900/30 border border-amber-700 text-amber-200 px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !error && notes.length === 0 && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-8 text-center">
            <p className="text-zinc-400 text-sm mb-4">
              No recordings yet. Start recording to see your transcriptions here.
            </p>
            <Link
              href="/record"
              className="inline-block py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Record now
            </Link>
          </div>
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="space-y-4">
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl bg-zinc-900 border border-zinc-700 p-5"
              >
                <time className="text-xs text-zinc-500 block mb-2">
                  {formatDate(note.created_at)}
                </time>
                <p className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed">
                  {note.transcript_text || "(empty)"}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
