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
import ActivityLog from "../components/ActivityLog.tsx";
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
    const email = workflow.tasks.find(
      (t) => t.type === "send_email" && t.scope?.contactId === contact.id,
    );
    const phone = workflow.tasks.find(
      (t) => t.type === "voice_call" && t.scope?.contactId === contact.id,
    );
    const call = workflow.tasks.find(
      (t) => t.type === "schedule_human_call" && t.scope?.contactId === contact.id,
    );
    return {
      contact,
      email: (email?.status ?? "pending") as TaskStatus,
      phone: (phone?.status ?? "pending") as TaskStatus,
      paid: call?.status === "completed" && (call.output as { scheduled?: boolean })?.scheduled === true,
    };
  });
}

function extractResearch(workflow: WorkflowViewType): MarketResearchOutput | null {
  const task = workflow.tasks.find(
    (t) => t.type === "market_research" && t.status === "completed",
  );
  return task?.output ? (task.output as MarketResearchOutput) : null;
}

function extractPage(workflow: WorkflowViewType): { url: string | null; html: string | null } {
  const task = workflow.tasks.find(
    (t) => t.type === "base_landing_page" && t.status === "completed",
  );
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
        solutionReaction: (out.solutionReaction as { positive: boolean; comment: string }) ?? {
          positive: false,
          comment: "",
        },
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
      emailsSent: 0,
      replies: 0,
      replyRate: 0,
      pageVisits: 0,
      paid: 0,
      paidRate: 0,
      confidence: 0,
      conclusion: "Validation starting \u2014 gathering initial data.",
    };
  }

  return {
    emailsSent,
    replies,
    replyRate: total > 0 ? Math.round((replies / total) * 100) : 0,
    pageVisits: emailsSent + Math.floor(emailsSent * 0.5),
    paid,
    paidRate: total > 0 ? Math.round((paid / total) * 100) : 0,
    confidence: Math.min(
      95,
      Math.round(
        (emailsSent / total) * 50 +
          (replies / Math.max(1, emailsSent)) * 30 +
          (paid > 0 ? 20 : 0),
      ),
    ),
    conclusion:
      paid > 0
        ? "Promising \u2014 paying customers found during validation."
        : emailsSent > 0
          ? "Outreach in progress. Collecting responses."
          : "Validation starting \u2014 gathering initial data.",
  };
}

// ---------------------------------------------------------------------------
// Progress steps
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

function ProgressBar({ workflow }: { workflow: WorkflowViewType }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {STEPS.map((step, i) => {
        const status = taskStatus(workflow, step.type);
        const done = status === "completed" || status === "skipped";
        const active = status === "running" || status === "ready";
        const failed = status === "failed";

        return (
          <div key={step.type} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  done
                    ? "bg-emerald-500"
                    : active
                      ? "bg-blue-500 animate-pulse"
                      : failed
                        ? "bg-red-500"
                        : "bg-neutral-200"
                }`}
              />
              <span
                className={`text-[11px] transition-colors ${
                  done
                    ? "text-emerald-600 font-medium"
                    : active
                      ? "text-blue-600 font-medium"
                      : failed
                        ? "text-red-500"
                        : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px ${done ? "bg-emerald-300" : "bg-neutral-200"}`} />
            )}
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
  const [loadLog, setLoadLog] = useState<string[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!id) return;
    const initialLines = [
      `GET /api/workflows/${id.slice(0, 8)}…`,
      "Fetching workflow state…",
    ];
    setLoadLog(initialLines);
    initialLines.forEach((l) => console.info(`[Valid8] ${l}`));

    getWorkflow(id)
      .then((w) => {
        const ok = "Workflow loaded.";
        console.info(`[Valid8] ${ok}`);
        setLoadLog((prev) => [...prev, ok]);
        setWorkflow(w);
        setPollError(null);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[Valid8] getWorkflow failed", e);
        const fail = `Failed: ${message}`;
        console.info(`[Valid8] ${fail}`);
        setLoadLog((prev) => [...prev, fail]);
        setError(message);
      })
      .finally(() => setLoading(false));

    intervalRef.current = setInterval(() => {
      getWorkflow(id)
        .then((w) => {
          setWorkflow(w);
          setPollError(null);
        })
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : String(e);
          console.error("[Valid8] workflow poll failed", e);
          setPollError(message);
        });
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  useEffect(() => {
    const s = workflow?.status;
    if (s === "completed" || s === "failed" || s === "waiting_for_input") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (s === "running" && !intervalRef.current && id) {
      intervalRef.current = setInterval(() => {
        getWorkflow(id)
          .then((w) => {
            setWorkflow(w);
            setPollError(null);
          })
          .catch((e: unknown) => {
            const message = e instanceof Error ? e.message : String(e);
            console.error("[Valid8] workflow poll failed", e);
            setPollError(message);
          });
      }, 3000);
    }
  }, [workflow?.status, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <ActivityLog lines={loadLog} />
        <p className="text-xs text-gray-400">Waiting for server…</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm gap-4 px-6">
        <ActivityLog lines={loadLog} />
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-red-600">{error ?? "Not found"}</span>
          <span className="text-gray-300">&mdash;</span>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            back
          </Link>
        </div>
      </div>
    );
  }

  const confirmTask = workflow.tasks.find((t) => t.type === "idea_confirmation");
  const needsConfirmation = confirmTask?.status === "waiting_for_input";

  if (needsConfirmation && confirmTask?.output) {
    return (
      <Clarification
        ideaText={workflow.ideaText}
        confirmation={confirmTask.output as IdeaConfirmationOutput}
        onConfirm={async () => {
          if (id) {
            try {
              await confirmIdea(id, true);
              await getWorkflow(id).then(setWorkflow);
            } catch (e) {
              console.error("[Valid8] confirmIdea failed", e);
              throw e;
            }
          }
        }}
        onRevise={async (r) => {
          if (id) {
            try {
              await confirmIdea(id, false, r);
              await getWorkflow(id).then(setWorkflow);
            } catch (e) {
              console.error("[Valid8] confirmIdea (revise) failed", e);
              throw e;
            }
          }
        }}
      />
    );
  }

  return <Dashboard workflow={workflow} pollError={pollError} onDismissPollError={() => setPollError(null)} />;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({
  workflow,
  pollError,
  onDismissPollError,
}: {
  workflow: WorkflowViewType;
  pollError: string | null;
  onDismissPollError: () => void;
}) {
  const contacts = useMemo(() => extractContacts(workflow), [workflow]);
  const research = extractResearch(workflow);
  const { url: pageUrl, html: pageHtml } = extractPage(workflow);
  const analytics = useMemo(() => computeAnalytics(contacts), [contacts]);
  const qualitative = useMemo(() => extractQualitative(workflow, contacts), [workflow, contacts]);

  const researchStatus = taskStatus(workflow, "market_research");
  const pageStatus = taskStatus(workflow, "base_landing_page");

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {pollError && (
        <div
          role="alert"
          className="shrink-0 flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 m-4 mb-0 text-xs text-amber-900"
        >
          <span>
            <span className="font-semibold">Update failed: </span>
            {pollError}
            <span className="text-amber-700"> (showing last good data; check console)</span>
          </span>
          <button
            type="button"
            onClick={onDismissPollError}
            className="shrink-0 text-amber-700 hover:text-amber-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="px-5 py-4 bg-white border-b border-neutral-100 flex items-center justify-between gap-4 shrink-0">
        <h1 className="text-[15px] font-semibold text-neutral-900 truncate">{workflow.ideaText}</h1>
        <ProgressBar workflow={workflow} />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 gap-3 grid grid-cols-2 grid-rows-2 min-h-0">
        <div className="row-span-2 min-h-0">
          <OutreachPanel contacts={contacts} callInsights={qualitative?.callInsights ?? []} />
        </div>
        <div className="min-h-0">
          <WebsitePreview url={pageUrl} html={pageHtml} status={pageStatus} />
        </div>
        <div className="min-h-0">
          <MarketResearchPanel research={research} status={researchStatus} />
        </div>
      </div>

      {/* Analytics */}
      <div className="px-4 pb-4">
        <AnalyticsBar analytics={analytics} qualitative={qualitative} />
      </div>
    </div>
  );
}
