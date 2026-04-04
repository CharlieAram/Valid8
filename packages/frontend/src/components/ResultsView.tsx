import type { ResultsSummaryOutput } from "@valid8/shared";

export default function ResultsView({ output }: { output: unknown }) {
  const d = output as ResultsSummaryOutput;
  const q = d.quantitative;

  return (
    <div className="border border-gray-200 rounded p-4">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-base font-semibold">
          {d.verdict === "validated" ? "Validated" : d.verdict === "invalidated" ? "Invalidated" : "Inconclusive"}
        </span>
        <span className="text-sm text-gray-400">{d.confidence}% confidence</span>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs mb-4">
        <Stat label="Emails sent" value={q.emailsSent} />
        <Stat label="Emails opened" value={q.emailsOpened} />
        <Stat label="Page visits" value={q.pageVisits} />
        <Stat label="Sign-ups" value={q.signups} />
        <Stat label="Calls scheduled" value={q.callsScheduled} />
        <Stat label="Calls completed" value={q.callsCompleted} />
      </div>

      {d.qualitative.positiveSignals.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Positive signals</div>
          <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5">
            {d.qualitative.positiveSignals.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {d.qualitative.commonObjections.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Objections</div>
          <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5">
            {d.qualitative.commonObjections.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {d.qualitative.keyInsights.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Key insights</div>
          <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5">
            {d.qualitative.keyInsights.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="text-sm text-gray-700 mb-3">{d.recommendation}</div>

      {d.pivotSuggestions && d.pivotSuggestions.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Alternative directions</div>
          <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5">
            {d.pivotSuggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-800 tabular-nums">{value}</span>
    </div>
  );
}
