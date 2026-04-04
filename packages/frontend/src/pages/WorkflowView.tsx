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
import ActivityFeed, { type ActivityItem } from "../components/ActivityFeed.tsx";
import WorkflowLiveActivity from "../components/WorkflowLiveActivity.tsx";
import { friendlyApiError } from "../utils/friendlyMessages.ts";
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
  { type: "idea_confirmation", label: "Idea" },
  { type: "market_research", label: "Market" },
  { type: "base_landing_page", label: "Page" },
  { type: "persona_identification", label: "People" },
  { type: "contact_discovery", label: "Contacts" },
  { type: "send_email", label: "Email" },
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
  const [loadItems, setLoadItems] = useState<ActivityItem[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!id) return;
    console.info(`[Valid8] GET /api/workflows/${id}`);

    setLoadItems([
      { text: "Connecting to your workspace…", tone: "muted" },
      { text: "Loading your validation run…" },
    ]);

    getWorkflow(id)
      .then((w) => {
        console.info("[Valid8] workflow loaded", id);
        setLoadItems((prev) => [...prev, { text: "You're up to date.", tone: "success" }]);
        setWorkflow(w);
        setPollError(null);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[Valid8] getWorkflow failed", e);
        const userMsg = friendlyApiError(message);
        setLoadItems((prev) => [...prev, { text: userMsg, tone: "error" }]);
        setError(userMsg);
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
    if (workflow && (workflow.status === "completed" || workflow.status === "failed")) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [workflow?.status]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 bg-neutral-50">
        <ActivityFeed
          items={loadItems}
          title="What's happening"
          footer={<span className="text-neutral-400">This usually takes a second or two.</span>}
        />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm gap-5 px-6 bg-neutral-50">
        <ActivityFeed items={loadItems} title="What we tried" />
        <div className="flex items-center gap-2 flex-wrap justify-center text-[15px]">
          <span className="text-red-600">{error ?? "We couldn't open this validation run."}</span>
          <span className="text-neutral-300">&middot;</span>
          <Link to="/" className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600">
            Back to home
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
          className="shrink-0 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 m-4 mb-0 text-[13px] text-amber-950 leading-snug"
        >
          <span>
            <span className="font-semibold">Couldn’t refresh the latest status. </span>
            You’re still seeing the last information we loaded. We’ll try again automatically. If this
            keeps up, check your connection — technical details are in the browser console.
          </span>
          <button
            type="button"
            onClick={onDismissPollError}
            className="shrink-0 text-sm font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="px-5 py-4 bg-white border-b border-neutral-100 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[15px] font-semibold text-neutral-900 truncate">{workflow.ideaText}</h1>
          <ProgressBar workflow={workflow} />
        </div>
        <WorkflowLiveActivity workflow={workflow} />
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
