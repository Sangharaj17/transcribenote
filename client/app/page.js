import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center text-white px-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/mainpage.jpg)" }}
      />
      <div className="absolute inset-0 bg-zinc-950/80" />
      <div className="relative z-10 w-full max-w-md text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            TranscribeNote
          </h1>
          <p className="text-zinc-400 text-sm">
            Record and transcribe your notes with live speech-to-text
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="w-full py-3 px-6 rounded-xl border border-zinc-600 hover:border-zinc-500 text-zinc-200 font-medium transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
