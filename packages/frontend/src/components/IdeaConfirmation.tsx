import { useState } from "react";
import type { IdeaConfirmationOutput } from "@valid8/shared";

interface Props {
  confirmation: IdeaConfirmationOutput;
  onConfirm: () => Promise<void>;
  onRevise: (revised: string) => Promise<void>;
}

export default function IdeaConfirmation({ confirmation, onConfirm, onRevise }: Props) {
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
    <div className="border border-gray-200 rounded p-4">
      <div className="text-xs font-medium text-gray-500 mb-3">
        Confirm this understanding before we proceed
      </div>

      <p className="text-sm mb-3">{confirmation.summary}</p>

      <dl className="grid grid-cols-3 gap-4 text-sm mb-4">
        <div>
          <dt className="text-xs text-gray-400">Target market</dt>
          <dd className="mt-0.5 text-gray-700">{confirmation.targetMarket}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Value prop</dt>
          <dd className="mt-0.5 text-gray-700">{confirmation.valueProposition}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Revenue</dt>
          <dd className="mt-0.5 text-gray-700">{confirmation.revenueModel}</dd>
        </div>
      </dl>

      {editing ? (
        <>
          <textarea
            value={revised}
            onChange={(e) => setRevised(e.target.value)}
            placeholder="Rewrite your idea..."
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 resize-y mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleRevise}
              disabled={!revised.trim() || busy}
              className="text-sm bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-40"
            >
              Re-analyze
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="text-sm bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-40"
          >
            {busy ? "Starting..." : "Confirm & start"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
          >
            Revise
          </button>
        </div>
      )}
    </div>
  );
}
