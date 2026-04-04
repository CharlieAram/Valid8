import { useState } from "react";
import type { IdeaConfirmationOutput } from "@valid8/shared";
import ActivityFeed, { type ActivityItem } from "./ActivityFeed.tsx";
import { friendlyApiError } from "../utils/friendlyMessages.ts";

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
  const [actionItems, setActionItems] = useState<ActivityItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setActionError(null);
    console.info("[Valid8] confirm idea");
    setActionItems([{ text: "Saving your confirmation…", tone: "muted" }, { text: "Starting market research and your landing page…" }]);
    try {
      await onConfirm();
      console.info("[Valid8] Idea confirmed — workflow tasks will start.");
    } catch (e) {
      console.error("[Valid8] confirm failed", e);
      const raw = e instanceof Error ? e.message : "Confirmation failed";
      const msg = friendlyApiError(raw);
      setActionError(msg);
      setActionItems((prev) => [...prev, { text: msg, tone: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevise() {
    if (!revised.trim()) return;
    setBusy(true);
    setActionError(null);
    console.info("[Valid8] revise idea");
    setActionItems([
      { text: "Sending your updated idea…", tone: "muted" },
      { text: "Re-reading your idea so we can continue…" },
    ]);
    try {
      await onRevise(revised.trim());
      console.info("[Valid8] Revised idea submitted — re-analyzing.");
      setEditing(false);
      setRevised("");
    } catch (e) {
      console.error("[Valid8] revise failed", e);
      const raw = e instanceof Error ? e.message : "Request failed";
      const msg = friendlyApiError(raw);
      setActionError(msg);
      setActionItems((prev) => [...prev, { text: msg, tone: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy) {
      e.preventDefault();
      if (editing && revised.trim()) handleRevise();
      else if (!editing) handleConfirm();
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-neutral-50" onKeyDown={handleKeyDown}>
      <div className="w-full max-w-2xl px-6">
        <div className="mb-6">
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-2">
            Your input
          </div>
          <div className="bg-white border border-neutral-200 px-4 py-3 text-sm text-neutral-600 leading-relaxed">
            {ideaText}
          </div>
        </div>

        <div className="mb-8">
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-2">
            Our understanding
          </div>
          <div className="bg-white border border-neutral-200 p-5">
            <p className="text-[15px] text-neutral-900 leading-relaxed mb-5">
              {confirmation.summary}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Target market", value: confirmation.targetMarket },
                { label: "Value proposition", value: confirmation.valueProposition },
                { label: "Revenue model", value: confirmation.revenueModel },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm text-neutral-700 leading-relaxed">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {editing ? (
          <div>
            {busy && actionItems.length > 0 && (
              <div className="mb-3">
                <ActivityFeed items={actionItems} title="What's happening" />
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
              className="w-full border border-neutral-200 px-4 py-3.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-y bg-white transition-all"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRevise}
                disabled={!revised.trim() || busy}
                className="px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium cursor-pointer hover:bg-neutral-800 disabled:opacity-30 transition-all"
              >
                {busy ? "Sending…" : "Re-analyze"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 text-neutral-500 text-sm hover:text-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {busy && actionItems.length > 0 && <ActivityFeed items={actionItems} title="What's happening" />}
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
