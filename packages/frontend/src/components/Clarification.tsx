import { useState } from "react";
import type { IdeaConfirmationOutput } from "@valid8/shared";
import ActivityLog from "./ActivityLog.tsx";

interface Props {
  ideaText: string;
  confirmation: IdeaConfirmationOutput;
  onConfirm: () => Promise<void>;
  onRevise: (revised: string) => Promise<void>;
}

export default function Clarification({ ideaText, confirmation, onConfirm, onRevise }: Props) {
  const [editing, setEditing] = useState(false);
  const [revised, setRevised] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setActionError(null);
    const line = "POST /api/workflows/…/confirm (confirmed)";
    setActionLog([line]);
    console.info(`[Valid8] ${line}`);
    try {
      await onConfirm();
      console.info("[Valid8] Idea confirmed — workflow tasks will start.");
    } catch (e) {
      console.error("[Valid8] confirm failed", e);
      const msg = e instanceof Error ? e.message : "Confirmation failed";
      setActionError(msg);
      setActionLog((prev) => [...prev, `Error: ${msg}`]);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    if (!revised.trim()) return;
    setBusy(true);
    setActionError(null);
    const line = "POST /api/workflows/…/confirm (revised idea)";
    setActionLog([line]);
    console.info(`[Valid8] ${line}`);
    try {
      await onRevise(revised.trim());
      console.info("[Valid8] Revised idea submitted — re-analyzing.");
      setEditing(false);
      setRevised("");
    } catch (e) {
      console.error("[Valid8] revise failed", e);
      const msg = e instanceof Error ? e.message : "Request failed";
      setActionError(msg);
      setActionLog((prev) => [...prev, `Error: ${msg}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-2xl px-6">
        <div className="mb-6">
          <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            Initial Input
          </h2>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed">
            {ideaText}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            Clarification
          </h2>
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            <p className="text-sm text-gray-900 leading-relaxed mb-4">{confirmation.summary}</p>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Target Market</dt>
                <dd className="text-gray-700">{confirmation.targetMarket}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Value Proposition</dt>
                <dd className="text-gray-700">{confirmation.valueProposition}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Revenue Model</dt>
                <dd className="text-gray-700">{confirmation.revenueModel}</dd>
              </div>
            </dl>
          </div>
        </div>

        {editing ? (
          <div>
            {busy && actionLog.length > 0 && (
              <div className="mb-3">
                <ActivityLog lines={actionLog} />
              </div>
            )}
            {actionError && !busy && (
              <p className="mb-2 text-sm text-red-600">{actionError}</p>
            )}
            <textarea
              value={revised}
              onChange={(e) => setRevised(e.target.value)}
              placeholder="Rewrite or clarify your idea..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-y"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRevise}
                disabled={!revised.trim() || busy}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40"
              >
                {busy ? "Sending…" : "Re-analyze"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {busy && actionLog.length > 0 && <ActivityLog lines={actionLog} />}
            {actionError && !busy && (
              <p className="text-sm text-red-600 text-center max-w-md">{actionError}</p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40"
              >
                {busy ? "Sending…" : "Confirm \u2713"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Clarify \u2717
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
