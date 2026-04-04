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
    <div className="px-3 py-2">
      <div className={`text-sm font-semibold tabular-nums leading-none ${highlight ? "text-emerald-600" : "text-neutral-900"}`}>
        {value}{unit}
      </div>
      <div className="text-[10px] text-neutral-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function AnalyticsBar({ analytics, qualitative }: Props) {
  const [expanded, setExpanded] = useState(false);
  const q = qualitative;
  const hasCalls = q && q.callInsights.length > 0;

  return (
    <div className="border border-neutral-200 bg-white shrink-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center cursor-pointer"
      >
        <div className="flex items-center divide-x divide-neutral-100 flex-1 min-w-0">
          <Metric label="Paid" value={`${analytics.paidRate}%`} highlight={analytics.paidRate > 0} />
          <Metric label="Reply rate" value={`${analytics.replyRate}%`} />
          <Metric label="Confidence" value={`${analytics.confidence}%`} highlight={analytics.confidence > 70} />
          <Metric label="Visits" value={analytics.pageVisits} />
          <Metric label="Emails" value={analytics.emailsSent} />
          <div className="flex-1 px-3 py-2 min-w-0 text-left">
            <div className="text-[10px] text-neutral-500 leading-relaxed line-clamp-2">
              {analytics.conclusion}
            </div>
          </div>
        </div>
        <div className="px-2 text-neutral-400 text-[10px] shrink-0">
          {expanded ? "\u25BE" : "\u25B8"}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 p-3 grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
          <Card title="Problem value ($/yr)">
            {q?.problemValueAvg != null ? (
              <div className="space-y-0.5">
                <div className="text-base font-semibold text-neutral-900">
                  <Dollars value={q.problemValueAvg} />
                  <span className="text-[10px] font-normal text-neutral-400 ml-1">avg</span>
                </div>
                <div className="text-[10px] text-neutral-500">
                  <Dollars value={q.problemValueMin} /> &ndash; <Dollars value={q.problemValueMax} />
                </div>
              </div>
            ) : <NoData />}
          </Card>

          <Card title="Validation rates">
            <div className="space-y-2">
              <RateBar label="Recognize problem" pct={q?.problemRecognitionRate ?? 0} />
              <RateBar label="Approve solution" pct={q?.solutionApprovalRate ?? 0} />
              <RateBar label="Open to call" pct={q?.salesCallRate ?? 0} />
            </div>
          </Card>

          <Card title="Confidence">
            <div className="text-xl font-semibold text-neutral-900 tabular-nums">{analytics.confidence}%</div>
            <div className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{analytics.conclusion}</div>
          </Card>

          <Card title="Top problems">
            {q?.topProblemsAggregate.length ? (
              <ol className="space-y-0.5">
                {q.topProblemsAggregate.slice(0, 5).map((p, i) => (
                  <li key={i} className="text-[10px] text-neutral-700">
                    <span className="text-neutral-400 mr-1">{i + 1}.</span>{p}
                  </li>
                ))}
              </ol>
            ) : <NoData />}
          </Card>

          <Card title="Why unsolved">
            {q?.topUnsolved.length ? (
              <div className="space-y-1">
                {q.topUnsolved.slice(0, 4).map((r, i) => (
                  <p key={i} className="text-[10px] text-neutral-600">&ldquo;{r}&rdquo;</p>
                ))}
              </div>
            ) : <NoData />}
          </Card>

          <Card title="Positive signals">
            {q?.topPositiveSignals.length ? (
              <div className="space-y-1">
                {q.topPositiveSignals.slice(0, 4).map((s, i) => (
                  <p key={i} className="text-[10px] text-emerald-700">&ldquo;{s}&rdquo;</p>
                ))}
              </div>
            ) : <NoData />}
          </Card>

          {q?.topObjections.length ? (
            <Card title="Objections">
              <div className="space-y-1">
                {q.topObjections.map((o, i) => (
                  <p key={i} className="text-[10px] text-red-600">&ldquo;{o}&rdquo;</p>
                ))}
              </div>
            </Card>
          ) : null}

          {hasCalls && (
            <div className="col-span-3">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                Individual calls
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {q.callInsights.map((c, i) => <CallCard key={i} insight={c} />)}
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
    <div className="border border-neutral-100 p-2.5">
      <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function NoData() {
  return <div className="text-[10px] text-neutral-300">No data yet</div>;
}

function Dollars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-neutral-300">&mdash;</span>;
  return <>${value >= 1000 ? `${Math.round(value / 1000)}k` : value}</>;
}

function RateBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-neutral-900 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 bg-neutral-100 overflow-hidden">
        <div className="h-full bg-neutral-900 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function CallCard({ insight }: { insight: CallInsight }) {
  return (
    <div className="border border-neutral-100 p-2 text-[10px] space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-900">{insight.contactName}</span>
        <div className="flex gap-1">
          <Pill positive={insight.hasProblem}>{insight.hasProblem ? "Has problem" : "No problem"}</Pill>
          <Pill positive={insight.willingToTalk}>{insight.willingToTalk ? "Will talk" : "No call"}</Pill>
        </div>
      </div>
      {insight.problemValueUsd != null && (
        <div className="text-neutral-500">
          Worth: <span className="font-medium text-neutral-800">${insight.problemValueUsd.toLocaleString()}/yr</span>
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
    <span className={`px-1 py-px text-[9px] font-medium ${
      positive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
    }`}>
      {children}
    </span>
  );
}
