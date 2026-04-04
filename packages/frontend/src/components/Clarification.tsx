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
                Re-analyze
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
          <div className="flex justify-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40"
            >
              {busy ? "Starting..." : "Confirm \u2713"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Clarify \u2717
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
