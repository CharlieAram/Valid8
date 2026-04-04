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
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-md px-6">
        <h1 className="text-base font-semibold text-neutral-900 mb-1">New validation</h1>
        <p className="text-xs text-neutral-500 mb-5">
          Describe a B2B idea. We'll research the market, find prospects, and test demand.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="What's the idea? Who's it for?"
            rows={4}
            className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900 resize-y"
            disabled={submitting}
            autoFocus
          />
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!idea.trim() || submitting}
              className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Analyzing..." : "Start"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
