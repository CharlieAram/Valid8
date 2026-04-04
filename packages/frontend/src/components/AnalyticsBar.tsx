import { useState } from "react";
import type { QualitativeInsights, CallInsight } from "../mock.ts";

export interface Analytics {
  emailsSent: number;
  replies: number;
  replyRate: number;
  pageVisits: number;
  paid: number;
  paidRate: number;
  confidence: number;
  conclusion: string;
}

interface Props {
  analytics: Analytics;
  qualitative: QualitativeInsights | null;
}

// ---------------------------------------------------------------------------
// Compact stat used in the top bar
// ---------------------------------------------------------------------------

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`px-4 py-2.5 ${accent ? "bg-green-50/50" : ""}`}>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-green-700" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card used in the expanded section
// ---------------------------------------------------------------------------

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function Dollars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  return <>${value >= 1000 ? `${Math.round(value / 1000)}k` : value}</>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsBar({ analytics, qualitative }: Props) {
  const [expanded, setExpanded] = useState(false);
  const q = qualitative;
  const hasCalls = q && q.callInsights.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg bg-white shrink-0 transition-all">
      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center cursor-pointer"
      >
        <div className="flex items-stretch divide-x divide-gray-100 flex-1 min-w-0">
          <Stat label="Paid" value={`${analytics.paidRate}%`} accent />
          <Stat label="Reply Rate" value={`${analytics.replyRate}%`} />
          <Stat label="Confidence" value={`${analytics.confidence}%`} accent={analytics.confidence > 70} />
          <Stat label="Page Visits" value={String(analytics.pageVisits)} />
          <Stat label="Emails Sent" value={String(analytics.emailsSent)} />
          <div className="flex-1 px-4 py-2.5 min-w-0 text-left">
            <div className="text-[11px] text-gray-400 mb-0.5">Conclusion</div>
            <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
              {analytics.conclusion}
            </div>
          </div>
        </div>
        <div className="px-3 text-gray-400 text-sm shrink-0">
          {expanded ? "▾" : "▸"}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
          {/* Problem Value */}
          <Card title="Problem Value ($/yr)">
            {q?.problemValueAvg != null ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">
                  <Dollars value={q.problemValueAvg} />
                  <span className="text-sm font-normal text-gray-400 ml-1">avg</span>
                </div>
                <div className="text-xs text-gray-500">
                  Range: <Dollars value={q.problemValueMin} /> – <Dollars value={q.problemValueMax} />
                </div>
                <div className="text-xs text-gray-400">
                  {q.callInsights.filter((c) => c.problemValueUsd != null).length} of {q.callInsights.length} gave a number
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-300">No data yet</div>
            )}
          </Card>

          {/* Recognition & Approval rates */}
          <Card title="Validation Rates">
            <div className="space-y-2">
              <RateRow label="Recognize the problem" pct={q?.problemRecognitionRate ?? 0} />
              <RateRow label="Approve our solution" pct={q?.solutionApprovalRate ?? 0} />
              <RateRow label="Open to sales call" pct={q?.salesCallRate ?? 0} />
            </div>
          </Card>

          {/* Confidence breakdown */}
          <Card title="Confidence">
            <div className="text-3xl font-bold text-gray-900 mb-1">{analytics.confidence}%</div>
            <div className="text-xs text-gray-500 leading-relaxed">{analytics.conclusion}</div>
          </Card>

          {/* Top problems */}
          <Card title="Top Problems Cited">
            {q?.topProblemsAggregate.length ? (
              <ul className="space-y-1">
                {q.topProblemsAggregate.slice(0, 5).map((p, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-gray-400 shrink-0">{i + 1}.</span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-300">No data yet</div>
            )}
          </Card>

          {/* Why unsolved */}
          <Card title="Why It's Unsolved">
            {q?.topUnsolved.length ? (
              <ul className="space-y-1.5">
                {q.topUnsolved.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">"{r}"</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-300">No data yet</div>
            )}
          </Card>

          {/* Positive signals */}
          <Card title="Positive Signals">
            {q?.topPositiveSignals.length ? (
              <ul className="space-y-1.5">
                {q.topPositiveSignals.slice(0, 4).map((s, i) => (
                  <li key={i} className="text-xs text-green-700 leading-relaxed">"{s}"</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-300">No signals yet</div>
            )}
          </Card>

          {/* Objections */}
          {q?.topObjections.length ? (
            <Card title="Objections">
              <ul className="space-y-1.5">
                {q.topObjections.map((o, i) => (
                  <li key={i} className="text-xs text-red-700 leading-relaxed">"{o}"</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Per-call detail */}
          {hasCalls && (
            <div className="col-span-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Individual Call Summaries
              </div>
              <div className="grid grid-cols-2 gap-2">
                {q.callInsights.map((c, i) => (
                  <CallCard key={i} insight={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RateRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all bg-blue-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function CallCard({ insight }: { insight: CallInsight }) {
  return (
    <div className="border border-gray-100 rounded-md p-3 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{insight.contactName}</span>
        <div className="flex gap-1.5">
          <Tag positive={insight.hasProblem}>
            {insight.hasProblem ? "Has problem" : "No problem"}
          </Tag>
          <Tag positive={insight.willingToTalk}>
            {insight.willingToTalk ? "Will talk" : "No call"}
          </Tag>
        </div>
      </div>
      {insight.problemValueUsd != null && (
        <div className="text-gray-500">
          Problem worth: <span className="font-medium text-gray-800">${insight.problemValueUsd.toLocaleString()}/yr</span>
        </div>
      )}
      <div className={`leading-relaxed ${insight.solutionReaction.positive ? "text-green-700" : "text-red-700"}`}>
        "{insight.solutionReaction.comment}"
      </div>
    </div>
  );
}

function Tag({ positive, children }: { positive: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
        positive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {children}
    </span>
  );
}
