export type TaskStatus =
  | "pending"
  | "ready"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_for_input";

export type TaskType =
  | "idea_confirmation"
  | "market_research"
  | "base_landing_page"
  | "assumption_generation"
  | "persona_identification"
  | "contact_discovery"
  | "personalize_page"
  | "send_email"
  | "voice_call"
  | "schedule_human_call"
  | "results_summary"
  | "pivot_proposals";

export interface WorkflowView {
  id: string;
  ideaText: string;
  createdAt: string;
  status: "waiting_for_input" | "running" | "completed" | "failed";
  tasks: TaskView[];
  progress: { completed: number; total: number };
}

export interface TaskView {
  id: string;
  type: TaskType;
  status: TaskStatus;
  scope: Record<string, string> | null;
  output: unknown;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateWorkflowRequest {
  ideaText: string;
}

export interface ConfirmIdeaRequest {
  confirmed: boolean;
  revisedIdea?: string;
}

// What the AI returns for idea confirmation
export interface IdeaConfirmationOutput {
  summary: string;
  targetMarket: string;
  valueProposition: string;
  revenueModel: string;
}

export interface MarketResearchOutput {
  overview: string;
  marketSize: string;
  competitors: Array<{ name: string; description: string; strengths: string; weaknesses: string }>;
  trends: string[];
  opportunities: string[];
  risks: string[];
}

export interface AssumptionOutput {
  assumptions: Array<{
    id: string;
    statement: string;
    category: "desirability" | "feasibility" | "viability";
    criticality: "high" | "medium" | "low";
  }>;
}

export interface PersonaOutput {
  personas: Array<{
    id: string;
    title: string;
    description: string;
    jobsToBeDone: string[];
    painPoints: string[];
    companies: string[];
  }>;
}

/** What we could resolve from the open web (Tavily + parsing). */
export interface ContactDiscoveryResult {
  /** Real person name (from LinkedIn title/slug or search), not a placeholder label. */
  fullName: string;
  /** Best email found in search snippets, or null. */
  email: string | null;
  linkedinUrl?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    reddit?: string;
  };
  /** Pages Tavily used (for transparency / debugging). */
  sources: Array<{ url: string; title?: string }>;
  resolutionNotes?: string;
}

export interface ContactOutput {
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    company: string;
    role: string;
    personaId: string;
    linkedinUrl?: string;
    discovery?: ContactDiscoveryResult;
  }>;
}

export interface ResultsSummaryOutput {
  verdict: "validated" | "invalidated" | "inconclusive";
  confidence: number;
  quantitative: {
    emailsSent: number;
    emailsOpened: number;
    pageVisits: number;
    signups: number;
    callsScheduled: number;
    callsCompleted: number;
  };
  qualitative: {
    keyInsights: string[];
    commonObjections: string[];
    positiveSignals: string[];
  };
  recommendation: string;
  pivotSuggestions?: string[];
}
