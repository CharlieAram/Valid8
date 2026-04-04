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
// Data extraction helpers — pull structured data from raw task outputs.
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
  // Extract structured call insights from voice_call task outputs
  const callInsights: CallInsight[] = [];
  for (const c of contacts) {
    const voiceTask = workflow.tasks.find(
      (t) => t.type === "voice_call" && t.scope?.contactId === c.contact.id && t.status === "completed",
    );
    if (!voiceTask?.output) continue;
    const out = voiceTask.output as Record<string, unknown>;
    // If the voice call handler returns structured call data, use it.
    // Expected shape (from future integration):
    //   { topProblems, hasProblem, problemValueUsd, whyUnsolved, solutionReaction, willingToTalk }
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
  // MOCK FALLBACK — remove when voice call handler returns structured data
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
      conclusion: "Validation starting — gathering initial data.",
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
        ? "Promising signals — paying customers found during validation."
        : emailsSent > 0
          ? "Outreach in progress. Collecting responses."
          : "Validation starting — gathering initial data.",
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function WorkflowView() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<WorkflowViewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!id) return;
    getWorkflow(id)
      .then(setWorkflow)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    intervalRef.current = setInterval(() => getWorkflow(id).then(setWorkflow), 3000);
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
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex items-center justify-center h-full text-sm">
        <span className="text-red-600">{error ?? "Not found"}</span>
        <span className="mx-2">&mdash;</span>
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          back
        </Link>
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
            await confirmIdea(id, true);
            getWorkflow(id).then(setWorkflow);
          }
        }}
        onRevise={async (r) => {
          if (id) {
            await confirmIdea(id, false, r);
            getWorkflow(id).then(setWorkflow);
          }
        }}
      />
    );
  }

  return <Dashboard workflow={workflow} />;
}

// ---------------------------------------------------------------------------
// Dashboard — the 4-panel layout
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
    <div className="h-full flex flex-col p-4 gap-3">
      <h1 className="text-lg font-semibold text-gray-900 truncate shrink-0">
        {workflow.ideaText}
      </h1>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-h-0">
        <div className="row-span-2 min-h-0">
          <OutreachPanel contacts={contacts} />
        </div>
        <div className="min-h-0">
          <WebsitePreview url={pageUrl} html={pageHtml} status={pageStatus} />
        </div>
        <div className="min-h-0">
          <MarketResearchPanel research={research} status={researchStatus} />
        </div>
      </div>

      <AnalyticsBar analytics={analytics} qualitative={qualitative} />
    </div>
  );
}
