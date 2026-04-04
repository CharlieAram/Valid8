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
      <div className="w-full max-w-xl px-6">
        <h1 className="text-lg font-semibold mb-1">New Idea</h1>
        <p className="text-sm text-gray-500 mb-6">
          Describe the B2B idea you want to validate.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="What's the idea? Who's it for? How does it make money?"
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-y"
            disabled={submitting}
            autoFocus
          />
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!idea.trim() || submitting}
              className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Analyzing..." : "Start"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
