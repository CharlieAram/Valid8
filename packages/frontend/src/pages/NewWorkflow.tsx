import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkflow } from "../api.ts";

export default function NewWorkflow() {
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createWorkflow(idea.trim());
      navigate(`/workflow/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
            placeholder="e.g. AI-powered safety cameras for construction sites that detect hazards in real-time and alert supervisors..."
            rows={5}
            className="w-full border border-neutral-200 px-4 py-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-y bg-white transition-all"
            disabled={submitting}
            autoFocus
          />
          {error && (
            <div className="mt-2.5 text-sm text-red-600 bg-red-50 px-3 py-2">
              {error}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={!idea.trim() || submitting}
              className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Analyzing..." : "Start validation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
