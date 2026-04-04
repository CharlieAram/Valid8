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
import {
  getMockContacts,
  MOCK_RESEARCH,
  MOCK_ANALYTICS,
  MOCK_PAGE_URL,
  type ContactPipeline,
} from "../mock.ts";
import type { Analytics } from "../components/AnalyticsBar.tsx";

// ---------------------------------------------------------------------------
// Data extraction helpers — pull structured data from raw task outputs.
// When a task hasn't completed yet, falls back to mock data.
// Remove mock fallbacks as real services are integrated.
// ---------------------------------------------------------------------------

function taskStatus(workflow: WorkflowViewType, type: string): TaskStatus {
  return (workflow.tasks.find((t) => t.type === type)?.status ?? "pending") as TaskStatus;
}

function extractContacts(workflow: WorkflowViewType): ContactPipeline[] {
  const discovery = workflow.tasks.find(
    (t) => t.type === "contact_discovery" && t.status === "completed",
  );
  if (!discovery?.output) return getMockContacts(); // MOCK FALLBACK

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

function computeAnalytics(contacts: ContactPipeline[]): Analytics {
  if (contacts.length === 0) return MOCK_ANALYTICS; // MOCK FALLBACK

  const total = contacts.length;
  const emailsSent = contacts.filter((c) => c.email === "completed").length;
  const replies = contacts.filter((c) => ["completed", "running"].includes(c.phone)).length;
  const paid = contacts.filter((c) => c.paid).length;

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
// Dashboard — the 4-panel layout matching the wireframe
// ---------------------------------------------------------------------------

function Dashboard({ workflow }: { workflow: WorkflowViewType }) {
  const contacts = useMemo(() => extractContacts(workflow), [workflow]);
  const research = extractResearch(workflow);
  const { url: pageUrl, html: pageHtml } = extractPage(workflow);
  const analytics = useMemo(() => computeAnalytics(contacts), [contacts]);

  const researchStatus = taskStatus(workflow, "market_research");
  const pageStatus = taskStatus(workflow, "base_landing_page");

  // Use real data when available, mock data as fallback
  const displayResearch = research ?? MOCK_RESEARCH; // MOCK FALLBACK
  const displayResearchStatus = research ? ("completed" as const) : researchStatus;
  const displayPageUrl = pageUrl ?? (pageHtml ? null : MOCK_PAGE_URL); // MOCK FALLBACK only if no HTML
  const displayPageHtml = pageHtml ?? null;
  const displayPageStatus = pageUrl || pageHtml ? ("completed" as const) : pageStatus;
  const displayContacts = contacts.length > 0 ? contacts : getMockContacts(); // MOCK FALLBACK
  const displayAnalytics = contacts.length > 0 ? analytics : MOCK_ANALYTICS; // MOCK FALLBACK

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h1 className="text-lg font-semibold text-gray-900 truncate shrink-0">
        {workflow.ideaText}
      </h1>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-h-0">
        <div className="row-span-2 min-h-0">
          <OutreachPanel contacts={displayContacts} />
        </div>
        <div className="min-h-0">
          <WebsitePreview url={displayPageUrl} html={displayPageHtml} status={displayPageStatus} />
        </div>
        <div className="min-h-0">
          <MarketResearchPanel research={displayResearch} status={displayResearchStatus} />
        </div>
      </div>

      <AnalyticsBar analytics={displayAnalytics} />
    </div>
  );
}
