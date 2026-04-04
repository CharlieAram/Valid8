import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkflow } from "../api.ts";
import ActivityLog from "../components/ActivityLog.tsx";

export default function NewWorkflow() {
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    setSubmitting(true);
    setError(null);
    const lines = ["POST /api/workflows", "Creating workflow and idea confirmation task…"];
    setLog(lines);
    lines.forEach((l) => console.info(`[Valid8] ${l}`));
    try {
      const result = await createWorkflow(idea.trim());
      const next = `Created workflow ${result.id.slice(0, 8)}…`;
      console.info(`[Valid8] ${next}`);
      setLog((prev) => [...prev, next, "Redirecting…"]);
      navigate(`/workflow/${result.id}`);
    } catch (err) {
      console.error("[Valid8] createWorkflow failed", err);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setLog((prev) => [...prev, `Error: ${msg}`]);
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-neutral-50">
      <div className="w-full max-w-lg px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Validate an idea
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
            Describe your B2B idea. We'll research the market, find real prospects, and run outreach to test demand.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && idea.trim() && !submitting) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="e.g. AI-powered safety cameras for construction sites that detect hazards in real-time and alert supervisors..."
            rows={5}
            className="w-full border border-neutral-200 px-4 py-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-y bg-white transition-all"
            disabled={submitting}
            autoFocus
          />
          {submitting && log.length > 0 && (
            <div className="mt-3">
              <ActivityLog lines={log} />
            </div>
          )}
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!idea.trim() || submitting}
              className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium cursor-pointer hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Working…" : "Start"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
