import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkflow, confirmIdea } from "../api.ts";
import type {
  WorkflowView as WorkflowViewType,
  IdeaConfirmationOutput,
  MarketResearchOutput,
  ContactOutput,
  TaskStatus,
} from "@valid8/shared";
import Clarification from "../components/Clarification.tsx";
import type { ContactPipeline, QualitativeInsights } from "../mock.ts";
import { MOCK_QUALITATIVE, buildQualitativeInsights } from "../mock.ts";
import type { CallInsight } from "../mock.ts";

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function taskStatus(workflow: WorkflowViewType, type: string): TaskStatus {
  return (workflow.tasks.find((t) => t.type === type)?.status ?? "pending") as TaskStatus;
}

function extractContacts(workflow: WorkflowViewType): ContactPipeline[] {
  const discovery = workflow.tasks.find(
    (t) => t.type === "contact_discovery" && t.status === "completed",
  );
  if (!discovery?.output) return [];
  const { contacts } = discovery.output as ContactOutput;
  return contacts.map((contact) => {
    const email = workflow.tasks.find((t) => t.type === "send_email" && t.scope?.contactId === contact.id);
    const phone = workflow.tasks.find((t) => t.type === "voice_call" && t.scope?.contactId === contact.id);
    const call = workflow.tasks.find((t) => t.type === "schedule_human_call" && t.scope?.contactId === contact.id);
    return {
      contact,
      email: (email?.status ?? "pending") as TaskStatus,
      phone: (phone?.status ?? "pending") as TaskStatus,
      paid: call?.status === "completed" && (call.output as { scheduled?: boolean })?.scheduled === true,
    };
  });
}

function extractResearch(workflow: WorkflowViewType): MarketResearchOutput | null {
  const task = workflow.tasks.find((t) => t.type === "market_research" && t.status === "completed");
  return task?.output ? (task.output as MarketResearchOutput) : null;
}

function extractPage(workflow: WorkflowViewType): { url: string | null; html: string | null } {
  const task = workflow.tasks.find((t) => t.type === "base_landing_page" && t.status === "completed");
  if (!task?.output) return { url: null, html: null };
  const output = task.output as { url?: string; html?: string };
  return { url: output.url ?? null, html: output.html ?? null };
}

function extractQualitative(workflow: WorkflowViewType, contacts: ContactPipeline[]): QualitativeInsights | null {
  const callInsights: CallInsight[] = [];
  for (const c of contacts) {
    const voiceTask = workflow.tasks.find(
      (t) => t.type === "voice_call" && t.scope?.contactId === c.contact.id && t.status === "completed",
    );
    if (!voiceTask?.output) continue;
    const out = voiceTask.output as Record<string, unknown>;
    if (out.topProblems || out.hasProblem !== undefined) {
      callInsights.push({
        contactName: c.contact.name,
        topProblems: (out.topProblems as string[]) ?? [],
        hasProblem: (out.hasProblem as boolean) ?? false,
        problemValueUsd: (out.problemValueUsd as number) ?? null,
        whyUnsolved: (out.whyUnsolved as string) ?? "",
        solutionReaction: (out.solutionReaction as { positive: boolean; comment: string }) ?? { positive: false, comment: "" },
        willingToTalk: (out.willingToTalk as boolean) ?? false,
      });
    }
  }
  if (callInsights.length > 0) return buildQualitativeInsights(callInsights);
  return MOCK_QUALITATIVE;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkflowView() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<WorkflowViewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getWorkflow(id)
      .then(setWorkflow)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    intervalRef.current = setInterval(() => getWorkflow(id).then(setWorkflow), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id]);

  useEffect(() => {
    if (workflow && (workflow.status === "completed" || workflow.status === "failed")) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
  }, [workflow?.status]);

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-neutral-400">Loading...</div>;
  if (error || !workflow) return (
    <div className="flex items-center justify-center h-full text-sm">
      <span className="text-red-500">{error ?? "Not found"}</span>
      <Link to="/" className="ml-3 text-neutral-500 hover:text-neutral-800">&larr; back</Link>
    </div>
  );

  const confirmTask = workflow.tasks.find((t) => t.type === "idea_confirmation");
  if (confirmTask?.status === "waiting_for_input" && confirmTask?.output) {
    return (
      <Clarification
        ideaText={workflow.ideaText}
        confirmation={confirmTask.output as IdeaConfirmationOutput}
        onConfirm={async () => { if (id) { await confirmIdea(id, true); getWorkflow(id).then(setWorkflow); } }}
        onRevise={async (r) => { if (id) { await confirmIdea(id, false, r); getWorkflow(id).then(setWorkflow); } }}
      />
    );
  }

  return <Dashboard workflow={workflow} />;
}

// ---------------------------------------------------------------------------
// Dashboard — single scrollable column, sections appear as data arrives
// ---------------------------------------------------------------------------

function Dashboard({ workflow }: { workflow: WorkflowViewType }) {
  const contacts = useMemo(() => extractContacts(workflow), [workflow]);
  const research = extractResearch(workflow);
  const { url: pageUrl, html: pageHtml } = extractPage(workflow);
  const qualitative = useMemo(() => extractQualitative(workflow, contacts), [workflow, contacts]);

  const researchStatus = taskStatus(workflow, "market_research");
  const pageStatus = taskStatus(workflow, "base_landing_page");
  const contactStatus = taskStatus(workflow, "contact_discovery");

  const emailsSent = contacts.filter((c) => c.email === "completed").length;
  const callsDone = contacts.filter((c) => c.phone === "completed").length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-neutral-900 truncate">{workflow.ideaText}</h1>
          <StatusBadge status={workflow.status} />
        </div>
        <Steps workflow={workflow} />
      </div>

      <div className="px-6 py-6 space-y-8 max-w-4xl">
        {/* Metrics — only when there's outreach data */}
        {contacts.length > 0 && (
          <div className="flex gap-8">
            <MetricBlock label="Contacts" value={contacts.length} />
            <MetricBlock label="Emails sent" value={emailsSent} />
            <MetricBlock label="Calls done" value={callsDone} />
            <MetricBlock label="Paid" value={contacts.filter((c) => c.paid).length} highlight />
          </div>
        )}

        {/* Contacts & outreach */}
        {(contactStatus === "completed" || contactStatus === "running") && (
          <Section title="Contacts" count={contacts.length} loading={contactStatus === "running"}>
            {contacts.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {contacts.map((c) => (
                  <ContactRow key={c.contact.id} pipeline={c} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 py-4">Searching for people matching your target personas...</p>
            )}
          </Section>
        )}

        {/* Landing page */}
        {(pageStatus === "completed" || pageStatus === "running") && (
          <Section title="Landing page" loading={pageStatus === "running"}>
            {pageUrl || pageHtml ? (
              <PagePreview url={pageUrl} html={pageHtml} />
            ) : (
              <p className="text-sm text-neutral-400 py-2">Generating...</p>
            )}
          </Section>
        )}

        {/* Market research */}
        {(researchStatus === "completed" || researchStatus === "running") && (
          <Section title="Market research" loading={researchStatus === "running"}>
            {research ? <ResearchContent research={research} /> : (
              <p className="text-sm text-neutral-400 py-2">Researching...</p>
            )}
          </Section>
        )}

        {/* Qualitative insights */}
        {qualitative && qualitative.callInsights.length > 0 && (
          <Section title="Call insights">
            <QualitativeSection q={qualitative} />
          </Section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "text-emerald-700 bg-emerald-50",
    failed: "text-red-700 bg-red-50",
    running: "text-blue-700 bg-blue-50",
    waiting_for_input: "text-amber-700 bg-amber-50",
  };
  const labels: Record<string, string> = {
    completed: "Complete",
    failed: "Failed",
    running: "Running",
    waiting_for_input: "Waiting",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${map[status] ?? "text-neutral-500 bg-neutral-100"}`}>
      {labels[status] ?? status}
    </span>
  );
}

const STEP_TYPES = [
  "idea_confirmation",
  "market_research",
  "base_landing_page",
  "persona_identification",
  "contact_discovery",
  "send_email",
  "results_summary",
] as const;

function Steps({ workflow }: { workflow: WorkflowViewType }) {
  const total = STEP_TYPES.length;
  const done = STEP_TYPES.filter((t) => {
    const s = taskStatus(workflow, t);
    return s === "completed" || s === "skipped";
  }).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-neutral-400 tabular-nums shrink-0">{done}/{total}</span>
    </div>
  );
}

function MetricBlock({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${highlight && value > 0 ? "text-emerald-600" : "text-neutral-900"}`}>
        {value}
      </div>
      <div className="text-xs text-neutral-400 mt-0.5">{label}</div>
    </div>
  );
}

function Section({ title, count, loading, children }: {
  title: string;
  count?: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {count != null && <span className="text-xs text-neutral-400">{count}</span>}
        {loading && <span className="text-xs text-blue-500 animate-pulse">working...</span>}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact row
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    completed: "bg-emerald-500",
    running: "bg-blue-500 animate-pulse",
    ready: "bg-neutral-300",
    pending: "bg-neutral-300",
    waiting_for_input: "bg-amber-400",
    failed: "bg-red-500",
    skipped: "bg-neutral-300",
  };
  return <div className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} title={status} />;
}

function ContactRow({ pipeline }: { pipeline: ContactPipeline }) {
  const { contact, email, phone, paid } = pipeline;
  const linkedinUrl = contact.linkedinUrl ?? contact.discovery?.linkedinUrl;

  return (
    <div className="flex items-center gap-4 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-900">{contact.name}</div>
        <div className="text-xs text-neutral-500">
          {contact.role}, {contact.company}
          {linkedinUrl && (
            <>
              {" "}&middot;{" "}
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                LinkedIn
              </a>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <StatusDot status={email} />
          <span>Email</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={phone} />
          <span>Call</span>
        </div>
        {paid && <span className="text-emerald-600 font-medium">Paid</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page preview
// ---------------------------------------------------------------------------

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/http://") || url.startsWith("/https://")) return url.slice(1);
  return url;
}

function PagePreview({ url, html }: { url: string | null; html: string | null }) {
  const pageUrl = normalizeUrl(url);
  const hosted = !!pageUrl && pageUrl.startsWith("http") && !pageUrl.includes("placeholder");

  function handleOpen() {
    if (hosted && pageUrl) {
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    } else if (html) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    }
  }

  return (
    <div>
      <div className="rounded-md border border-neutral-200 overflow-hidden h-64 bg-neutral-50">
        {hosted ? (
          <iframe src={pageUrl!} title="Landing page" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" />
        ) : html ? (
          <iframe srcDoc={html} title="Landing page preview" className="w-full h-full border-0" sandbox="allow-scripts" />
        ) : null}
      </div>
      <button
        onClick={handleOpen}
        className="mt-2 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        Open in new tab &nearr;
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market research
// ---------------------------------------------------------------------------

function ResearchContent({ research }: { research: MarketResearchOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-neutral-700 leading-relaxed">{research.overview}</p>
      <p className="text-neutral-500 font-medium">{research.marketSize}</p>

      {research.competitors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 mb-2">Competitors</h3>
          <div className="space-y-1.5">
            {research.competitors.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-neutral-800">{c.name}</span>
                <span className="text-neutral-400"> &mdash; </span>
                <span className="text-neutral-500">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {research.opportunities.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2">Opportunities</h3>
            <ul className="space-y-1 text-sm text-neutral-600">
              {research.opportunities.map((o, i) => <li key={i}>&bull; {o}</li>)}
            </ul>
          </div>
        )}
        {research.risks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2">Risks</h3>
            <ul className="space-y-1 text-sm text-neutral-600">
              {research.risks.map((r, i) => <li key={i}>&bull; {r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Qualitative insights
// ---------------------------------------------------------------------------

function QualitativeSection({ q }: { q: QualitativeInsights }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-8 text-sm">
        {q.problemValueAvg != null && (
          <div>
            <div className="text-lg font-semibold text-neutral-900">
              ${q.problemValueAvg >= 1000 ? `${Math.round(q.problemValueAvg / 1000)}k` : q.problemValueAvg}
              <span className="text-xs font-normal text-neutral-400">/yr avg</span>
            </div>
            <div className="text-xs text-neutral-400">Problem value</div>
          </div>
        )}
        <div>
          <div className="text-lg font-semibold text-neutral-900">{q.problemRecognitionRate}%</div>
          <div className="text-xs text-neutral-400">Recognize problem</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-neutral-900">{q.solutionApprovalRate}%</div>
          <div className="text-xs text-neutral-400">Approve solution</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-neutral-900">{q.salesCallRate}%</div>
          <div className="text-xs text-neutral-400">Want a call</div>
        </div>
      </div>

      {q.topPositiveSignals.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 mb-1.5">Positive signals</h3>
          <div className="space-y-1">
            {q.topPositiveSignals.slice(0, 3).map((s, i) => (
              <p key={i} className="text-sm text-emerald-700">&ldquo;{s}&rdquo;</p>
            ))}
          </div>
        </div>
      )}

      {q.topObjections.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-500 mb-1.5">Objections</h3>
          <div className="space-y-1">
            {q.topObjections.slice(0, 3).map((o, i) => (
              <p key={i} className="text-sm text-red-600">&ldquo;{o}&rdquo;</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
