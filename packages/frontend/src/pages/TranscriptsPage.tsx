import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCallTranscripts, type CallTranscriptRow } from "../api.ts";

export default function TranscriptsPage() {
  const [rows, setRows] = useState<CallTranscriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listCallTranscripts()
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading transcripts…</div>
    );
  }

  if (err) {
    return (
      <div className="p-6 text-sm text-red-600">{err}</div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 min-h-0">
      <div className="shrink-0 mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Call transcripts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Saved from AI interview sessions (browser speech + questions).
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400">No transcripts yet. Complete an AI interview from a contact link.</p>
        )}
        {rows.map((row) => (
          <article
            key={row.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-medium text-gray-900">{row.contactName}</span>
                <span className="text-gray-400 mx-2">·</span>
                <Link
                  to={`/workflow/${row.workflowId}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[min(100%,28rem)] inline-block align-bottom"
                  title={row.ideaText}
                >
                  {row.ideaText.slice(0, 80)}
                  {row.ideaText.length > 80 ? "…" : ""}
                </Link>
              </div>
              <time className="text-xs text-gray-400 shrink-0" dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString()}
              </time>
            </div>
            <pre className="px-4 py-3 text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap font-mono max-h-80 overflow-y-auto">
              {row.transcript}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
