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

function Metric({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className="text-center px-4 py-2.5">
      <div className={`text-lg font-semibold tabular-nums leading-none ${highlight ? "text-emerald-600" : "text-neutral-900"}`}>
        {value}{unit && <span className="text-[11px] font-normal text-neutral-400 ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] text-neutral-400 mt-1">{label}</div>
    </div>
  );
}

export default function AnalyticsBar({ analytics, qualitative }: Props) {
  const [expanded, setExpanded] = useState(false);
  const q = qualitative;
  const hasCalls = q && q.callInsights.length > 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shrink-0 transition-all">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center cursor-pointer"
      >
        <div className="flex items-center divide-x divide-neutral-100 flex-1 min-w-0">
          <Metric label="Paid" value={analytics.paidRate} unit="%" highlight={analytics.paidRate > 0} />
          <Metric label="Reply rate" value={analytics.replyRate} unit="%" />
          <Metric label="Confidence" value={analytics.confidence} unit="%" highlight={analytics.confidence > 70} />
          <Metric label="Page visits" value={analytics.pageVisits} />
          <Metric label="Emails sent" value={analytics.emailsSent} />
          <div className="flex-1 px-4 py-2.5 min-w-0 text-left">
            <div className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
              {analytics.conclusion}
            </div>
          </div>
        </div>
        <div className="px-3 text-neutral-400 text-[11px] shrink-0">
          {expanded ? "\u25BE" : "\u25B8"}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 p-4 grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
          <Card title="Problem value ($/yr)">
            {q?.problemValueAvg != null ? (
              <div className="space-y-1">
                <div className="text-xl font-semibold text-neutral-900">
                  <Dollars value={q.problemValueAvg} />
                  <span className="text-[11px] font-normal text-neutral-400 ml-1">avg</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Range: <Dollars value={q.problemValueMin} /> &ndash; <Dollars value={q.problemValueMax} />
                </div>
              </div>
            ) : (
              <NoData />
            )}
          </Card>

          <Card title="Validation rates">
            <div className="space-y-2.5">
              <RateBar label="Recognize problem" pct={q?.problemRecognitionRate ?? 0} />
              <RateBar label="Approve solution" pct={q?.solutionApprovalRate ?? 0} />
              <RateBar label="Open to sales call" pct={q?.salesCallRate ?? 0} />
            </div>
          </Card>

          <Card title="Confidence">
            <div className="text-2xl font-semibold text-neutral-900 mb-1 tabular-nums">{analytics.confidence}%</div>
            <div className="text-[11px] text-neutral-500 leading-relaxed">{analytics.conclusion}</div>
          </Card>

          <Card title="Top problems cited">
            {q?.topProblemsAggregate.length ? (
              <ol className="space-y-1">
                {q.topProblemsAggregate.slice(0, 5).map((p, i) => (
                  <li key={i} className="text-[11px] text-neutral-700 leading-relaxed">
                    <span className="text-neutral-400 mr-1.5">{i + 1}.</span>{p}
                  </li>
                ))}
              </ol>
            ) : (
              <NoData />
            )}
          </Card>

          <Card title="Why it's unsolved">
            {q?.topUnsolved.length ? (
              <div className="space-y-1.5">
                {q.topUnsolved.slice(0, 4).map((r, i) => (
                  <p key={i} className="text-[11px] text-neutral-600 leading-relaxed">&ldquo;{r}&rdquo;</p>
                ))}
              </div>
            ) : (
              <NoData />
            )}
          </Card>

          <Card title="Positive signals">
            {q?.topPositiveSignals.length ? (
              <div className="space-y-1.5">
                {q.topPositiveSignals.slice(0, 4).map((s, i) => (
                  <p key={i} className="text-[11px] text-emerald-700 leading-relaxed">&ldquo;{s}&rdquo;</p>
                ))}
              </div>
            ) : (
              <NoData />
            )}
          </Card>

          {q?.topObjections.length ? (
            <Card title="Objections">
              <div className="space-y-1.5">
                {q.topObjections.map((o, i) => (
                  <p key={i} className="text-[11px] text-red-600 leading-relaxed">&ldquo;{o}&rdquo;</p>
                ))}
              </div>
            </Card>
          ) : null}

          {hasCalls && (
            <div className="col-span-3">
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-2">
                Individual calls
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-100 p-3.5 bg-neutral-50/50">
      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function NoData() {
  return <div className="text-[11px] text-neutral-300">No data yet</div>;
}

function Dollars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-neutral-300">&mdash;</span>;
  return <>${value >= 1000 ? `${Math.round(value / 1000)}k` : value}</>;
}

function RateBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-neutral-900 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function CallCard({ insight }: { insight: CallInsight }) {
  return (
    <div className="rounded-lg border border-neutral-100 p-3 text-[11px] space-y-1.5 bg-white">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-900">{insight.contactName}</span>
        <div className="flex gap-1">
          <Pill positive={insight.hasProblem}>{insight.hasProblem ? "Has problem" : "No problem"}</Pill>
          <Pill positive={insight.willingToTalk}>{insight.willingToTalk ? "Will talk" : "No call"}</Pill>
        </div>
      </div>
      {insight.problemValueUsd != null && (
        <div className="text-neutral-500">
          Problem worth: <span className="font-medium text-neutral-800">${insight.problemValueUsd.toLocaleString()}/yr</span>
        </div>
      )}
      <div className={insight.solutionReaction.positive ? "text-emerald-700" : "text-red-600"}>
        &ldquo;{insight.solutionReaction.comment}&rdquo;
      </div>
    </div>
  );
}

function Pill({ positive, children }: { positive: boolean; children: React.ReactNode }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
      positive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
    }`}>
      {children}
    </span>
  );
}
