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
import OutreachPanel from "../components/OutreachPanel.tsx";
import WebsitePreview from "../components/WebsitePreview.tsx";
import MarketResearchPanel from "../components/MarketResearchPanel.tsx";
import AnalyticsBar from "../components/AnalyticsBar.tsx";
import type { ContactPipeline, QualitativeInsights } from "../mock.ts";
import { MOCK_QUALITATIVE, buildQualitativeInsights } from "../mock.ts";
import type { CallInsight } from "../mock.ts";
import type { Analytics } from "../components/AnalyticsBar.tsx";

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

function computeAnalytics(contacts: ContactPipeline[]): Analytics {
  const total = contacts.length;
  const emailsSent = contacts.filter((c) => c.email === "completed").length;
  const replies = contacts.filter((c) => ["completed", "running"].includes(c.phone)).length;
  const paid = contacts.filter((c) => c.paid).length;

  if (total === 0) {
    return {
      emailsSent: 0, replies: 0, replyRate: 0, pageVisits: 0,
      paid: 0, paidRate: 0, confidence: 0,
      conclusion: "Validation starting.",
    };
  }

  return {
    emailsSent,
    replies,
    replyRate: Math.round((replies / total) * 100),
    pageVisits: emailsSent + Math.floor(emailsSent * 0.5),
    paid,
    paidRate: Math.round((paid / total) * 100),
    confidence: Math.min(95, Math.round(
      (emailsSent / total) * 50 + (replies / Math.max(1, emailsSent)) * 30 + (paid > 0 ? 20 : 0),
    )),
    conclusion: paid > 0
      ? "Paying customers found."
      : emailsSent > 0
        ? "Outreach in progress."
        : "Validation starting.",
  };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

const STEPS = [
  { type: "idea_confirmation", label: "Confirm" },
  { type: "market_research", label: "Research" },
  { type: "base_landing_page", label: "Page" },
  { type: "persona_identification", label: "Personas" },
  { type: "contact_discovery", label: "Contacts" },
  { type: "send_email", label: "Outreach" },
  { type: "results_summary", label: "Results" },
] as const;

function ProgressSteps({ workflow }: { workflow: WorkflowViewType }) {
  return (
    <div className="flex items-center gap-px">
      {STEPS.map((step) => {
        const s = taskStatus(workflow, step.type);
        const done = s === "completed" || s === "skipped";
        const active = s === "running" || s === "ready";
        const failed = s === "failed";
        return (
          <div
            key={step.type}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
              done
                ? "bg-emerald-500 text-white"
                : active
                  ? "bg-blue-500 text-white animate-pulse"
                  : failed
                    ? "bg-red-500 text-white"
                    : "bg-neutral-100 text-neutral-400"
            }`}
            title={`${step.label}: ${s}`}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
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

  if (loading) return <div className="flex items-center justify-center h-full text-xs text-neutral-400">Loading...</div>;
  if (error || !workflow) return (
    <div className="flex items-center justify-center h-full text-xs">
      <span className="text-red-500">{error ?? "Not found"}</span>
      <Link to="/" className="ml-3 text-neutral-400 hover:text-neutral-800">&larr; back</Link>
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
// Dashboard — 2x2 grid with header
// ---------------------------------------------------------------------------

function Dashboard({ workflow }: { workflow: WorkflowViewType }) {
  const contacts = useMemo(() => extractContacts(workflow), [workflow]);
  const research = extractResearch(workflow);
  const { url: pageUrl, html: pageHtml } = extractPage(workflow);
  const analytics = useMemo(() => computeAnalytics(contacts), [contacts]);
  const qualitative = useMemo(() => extractQualitative(workflow, contacts), [workflow, contacts]);

  const researchStatus = taskStatus(workflow, "market_research");
  const pageStatus = taskStatus(workflow, "base_landing_page");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-4 shrink-0 bg-white">
        <h1 className="text-sm font-semibold text-neutral-900 truncate">{workflow.ideaText}</h1>
        <ProgressSteps workflow={workflow} />
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-px bg-neutral-200 min-h-0">
        <div className="min-h-0 row-span-2">
          <OutreachPanel contacts={contacts} />
        </div>
        <div className="min-h-0">
          <WebsitePreview url={pageUrl} html={pageHtml} status={pageStatus} />
        </div>
        <div className="min-h-0">
          <MarketResearchPanel research={research} status={researchStatus} />
        </div>
      </div>

      {/* Analytics */}
      <AnalyticsBar analytics={analytics} qualitative={qualitative} />
    </div>
  );
}
