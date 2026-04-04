import { useState } from "react";
import type { IdeaConfirmationOutput } from "@valid8/shared";

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

  async function handleConfirm() {
    setBusy(true);
    await onConfirm();
  }

  async function handleRevise() {
    if (!revised.trim()) return;
    setBusy(true);
    await onRevise(revised.trim());
    setBusy(false);
    setEditing(false);
    setRevised("");
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
                className="px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-30 transition-all"
              >
                Re-analyze
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
          <div className="flex justify-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-30 transition-all"
            >
              {busy ? "Starting..." : "Looks right, start"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-2.5 border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-all"
            >
              Not quite, let me clarify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
