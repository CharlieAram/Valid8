import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import VoiceOrb from "../components/VoiceOrb.tsx";
import ActivityLog from "../components/ActivityLog.tsx";

type CallState =
  | "loading"
  | "welcome"
  | "speaking"
  | "listening"
  | "transitioning"
  | "complete"
  | "error";

interface SessionData {
  contactId: string;
  contactName: string;
  company: string;
  role: string;
  ideaSummary: string;
  greeting: string;
  questions: string[];
}

interface QA {
  question: string;
  answer: string;
}

export default function CallPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const [state, setState] = useState<CallState>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentQ, setCurrentQ] = useState(-1);
  const [displayText, setDisplayText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState("");
  const [loadLog, setLoadLog] = useState<string[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const responsesRef = useRef<QA[]>([]);
  const useFallbackRef = useRef(false);

  useEffect(() => {
    if (!contactId) return;
    const lines = [`GET /api/call/session/${contactId.slice(0, 8)}…`, "Loading interview session…"];
    setLoadLog(lines);
    lines.forEach((l) => console.info(`[Valid8] ${l}`));
    fetch(`/api/call/session/${contactId}`)
      .then((res) => {
        if (!res.ok) {
          const msg = `HTTP ${res.status} — session not found`;
          console.error("[Valid8] call session fetch failed", res.status, contactId);
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data: SessionData) => {
        console.info(`[Valid8] Session loaded for ${data.contactName}`);
        setLoadLog((prev) => [...prev, `Ready — ${data.contactName} @ ${data.company}`]);
        setSession(data);
        setState("welcome");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Valid8] call session error", err);
        setLoadLog((prev) => [...prev, `Error: ${message}`]);
        setError(message);
        setState("error");
      });
  }, [contactId]);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      initAudio();
      const ctx = audioCtxRef.current!;
      const analyser = analyserRef.current!;
      if (ctx.state === "suspended") await ctx.resume();

      if (!useFallbackRef.current) {
        try {
          const res = await fetch("/api/call/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });

          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("audio")) {
            const buf = await res.arrayBuffer();
            const decoded = await ctx.decodeAudioData(buf);
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(analyser);
            return new Promise<void>((resolve) => {
              source.onended = () => resolve();
              source.start();
            });
          }
          useFallbackRef.current = true;
        } catch {
          useFallbackRef.current = true;
        }
      }

      return new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        speechSynthesis.speak(u);
      });
    },
    [initAudio],
  );

  const listen = useCallback((): Promise<string> => {
    setLiveTranscript("");

    return new Promise((resolve) => {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) {
        setTimeout(
          () => resolve("(Speech recognition not supported in this browser)"),
          3000,
        );
        return;
      }

      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      let final = "";
      let silenceTimeout: ReturnType<typeof setTimeout>;

      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        setLiveTranscript(final + interim);
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => rec.stop(), 2500);
      };

      rec.onerror = () => resolve(final.trim() || "(no response)");
      rec.onend = () => {
        clearTimeout(silenceTimeout);
        resolve(final.trim() || "(no response)");
      };

      setTimeout(() => {
        try { rec.stop(); } catch { /* already stopped */ }
      }, 30_000);
      rec.start();
    });
  }, []);

  const startInterview = useCallback(async () => {
    if (!session) return;
    initAudio();
    responsesRef.current = [];

    setCurrentQ(-1);
    setDisplayText(session.greeting);
    setState("speaking");
    await speak(session.greeting);

    for (let i = 0; i < session.questions.length; i++) {
      setCurrentQ(i);
      setDisplayText(session.questions[i]);
      setState("speaking");
      await speak(session.questions[i]);

      setState("listening");
      setDisplayText(session.questions[i]);
      const answer = await listen();
      responsesRef.current.push({ question: session.questions[i], answer });

      setState("transitioning");
      await new Promise((r) => setTimeout(r, 600));
    }

    const outro =
      "Thank you for your time! Your responses have been recorded. We'll be in touch shortly.";
    setDisplayText(outro);
    setState("speaking");
    await speak(outro);

    setState("complete");

    fetch(`/api/call/session/${contactId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: responsesRef.current }),
    }).catch(console.error);
  }, [session, contactId, speak, listen, initAudio]);

  const orbState: "idle" | "speaking" | "listening" =
    state === "speaking"
      ? "speaking"
      : state === "listening"
        ? "listening"
        : "idle";

  if (state === "loading") {
    return (
      <Page>
        <div className="w-full max-w-md space-y-3">
          <ActivityLog lines={loadLog} title="Session" />
          <p className="text-white/40 text-sm text-center">Connecting…</p>
        </div>
      </Page>
    );
  }

  if (state === "error") {
    return (
      <Page>
        <div className="w-full max-w-md space-y-3">
          <ActivityLog lines={loadLog} title="Session" />
          <div className="text-red-400 text-sm text-center">{error}</div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl px-6 w-full">
        <p className="text-white/40 text-xs font-medium tracking-[0.25em] uppercase">
          Valid8 AI Interview
        </p>

        <VoiceOrb state={orbState} analyserNode={analyserRef.current} />

        <div className="text-center space-y-4 min-h-[140px] flex flex-col items-center justify-start">
          {state === "welcome" && session && (
            <>
              <p className="text-white/80 text-lg leading-relaxed">
                Hi {session.contactName}, you've been invited to a brief
                AI-powered screening interview.
              </p>
              <p className="text-white/40 text-sm max-w-md">
                {session.ideaSummary}
              </p>
              <button
                onClick={startInterview}
                className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-full font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25"
              >
                Begin Interview
              </button>
            </>
          )}

          {state === "speaking" && (
            <>
              <p className="text-white/90 text-lg leading-relaxed animate-fade-in">
                {displayText}
              </p>
              <ProgressDots
                total={session?.questions.length ?? 0}
                current={currentQ}
                mode="speaking"
              />
            </>
          )}

          {state === "transitioning" && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
              <div
                className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          )}

          {state === "listening" && (
            <>
              <p className="text-white/50 text-sm mb-2">{displayText}</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" />
                </span>
                <p className="text-cyan-400 text-sm font-medium">
                  Listening...
                </p>
              </div>
              {liveTranscript && (
                <p className="text-white/70 text-base italic mt-2 animate-fade-in">
                  "{liveTranscript}"
                </p>
              )}
              <ProgressDots
                total={session?.questions.length ?? 0}
                current={currentQ}
                mode="listening"
              />
            </>
          )}

          {state === "complete" && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <p className="text-white/90 text-lg">Interview Complete</p>
              <p className="text-white/40 text-sm">
                Thank you for your time. We'll be in touch shortly.
              </p>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

function ProgressDots({
  total,
  current,
  mode,
}: {
  total: number;
  current: number;
  mode: "speaking" | "listening";
}) {
  if (total === 0 || current < 0) return null;
  return (
    <div className="flex gap-2 justify-center mt-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i < current
              ? "bg-indigo-400"
              : i === current
                ? mode === "listening"
                  ? "bg-cyan-400 scale-125"
                  : "bg-indigo-500 scale-125"
                : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: "-10%",
          left: "-10%",
          animation: "orbFloat 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #7c3aed, transparent 70%)",
          bottom: "-10%",
          right: "-10%",
          animation: "orbFloat 25s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute w-[700px] h-[700px] rounded-full opacity-10 blur-[140px]"
        style={{
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          top: "30%",
          left: "30%",
          animation: "orbFloat 30s ease-in-out infinite",
        }}
      />
      {children}
    </div>
  );
}
