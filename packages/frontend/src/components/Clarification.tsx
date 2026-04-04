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

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-xl px-6">
        <p className="text-xs text-neutral-400 mb-1.5">Your input</p>
        <p className="text-sm text-neutral-600 mb-5 pl-3 border-l-2 border-neutral-200">{ideaText}</p>

        <p className="text-xs text-neutral-400 mb-1.5">Our understanding</p>
        <div className="mb-5">
          <p className="text-sm text-neutral-900 leading-relaxed mb-4">{confirmation.summary}</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-neutral-400 mb-0.5">Market</div>
              <div className="text-neutral-700">{confirmation.targetMarket}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-0.5">Value prop</div>
              <div className="text-neutral-700">{confirmation.valueProposition}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-0.5">Revenue</div>
              <div className="text-neutral-700">{confirmation.revenueModel}</div>
            </div>
          </div>
        </div>

        {editing ? (
          <div>
            <textarea
              value={revised}
              onChange={(e) => setRevised(e.target.value)}
              placeholder="Rewrite or clarify..."
              rows={3}
              className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900 resize-y"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRevise}
                disabled={!revised.trim() || busy}
                className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-30"
              >
                Re-analyze
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3.5 py-1.5 text-neutral-500 text-xs hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="px-3.5 py-1.5 bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-30"
            >
              {busy ? "Starting..." : "Correct, go"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-3.5 py-1.5 text-neutral-500 text-xs hover:text-neutral-700"
            >
              Clarify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
