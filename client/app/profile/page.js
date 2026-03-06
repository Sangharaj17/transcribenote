"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";

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
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });

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

  const fetchNotes = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (ok && data.notes) {
          setNotes(data.notes);
          setError("");
        } else {
          setNotes([]);
          setError(status === 401 ? "Session expired. Please sign in again." : (data?.error || "Failed to load recordings"));
        }
      })
      .catch(() => {
        setNotes([]);
        setError("Connection failed. Check " + (API_BASE || "API URL") + " and try again.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchNotes();
  }, [token, fetchNotes]);

  const getDisplayText = (note) => (edits[note.id] !== undefined ? edits[note.id] : (note.transcript_text ?? ""));
  const setNoteEdit = (noteId, text) => setEdits((prev) => ({ ...prev, [noteId]: text }));

  const handleSave = async (note) => {
    const text = getDisplayText(note);
    setSavingId(note.id);
    setSaveMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/api/notes/${note.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript_text: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, transcript_text: text } : n)));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[note.id];
          return next;
        });
        setSaveMessage({ type: "success", text: "Saved." });
      } else {
        setSaveMessage({ type: "error", text: data?.error || "Failed to save" });
      }
    } catch (e) {
      setSaveMessage({ type: "error", text: "Connection error" });
    } finally {
      setSavingId(null);
    }
  };

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
            {saveMessage.text && (
              <p className={saveMessage.type === "success" ? "text-emerald-400 text-sm" : "text-amber-400 text-sm"}>
                {saveMessage.text}
              </p>
            )}
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl bg-zinc-900 border border-zinc-700 p-5"
              >
                <time className="text-xs text-zinc-500 block mb-2">
                  {formatDate(note.created_at)}
                </time>
                <textarea
                  value={getDisplayText(note)}
                  onChange={(e) => setNoteEdit(note.id, e.target.value)}
                  placeholder="(empty)"
                  rows={6}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm leading-relaxed p-3 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleSave(note)}
                    disabled={savingId === note.id}
                    className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {savingId === note.id ? "Saving…" : "Save"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
