// ============================================
// MOCK DATA — Replace with real API data as services are integrated
//
// Each section maps to a backend integration point:
//   Contacts & pipeline → packages/backend/src/handlers/contact-discovery.ts
//   Email status        → packages/backend/src/services/agentsmail.ts
//   Phone status        → packages/backend/src/services/elevenlabs.ts
//   Website / page URL  → packages/backend/src/services/insforge.ts
//   Analytics           → packages/backend/src/handlers/results-summary.ts
//   Market research     → packages/backend/src/handlers/market-research.ts (already uses AI)
//
// To remove mock data: delete fallback references in pages/WorkflowView.tsx
// ============================================

import type { MarketResearchOutput, ContactOutput, TaskStatus } from "@valid8/shared";

export interface ContactPipeline {
  contact: ContactOutput["contacts"][number];
  email: TaskStatus;
  phone: TaskStatus;
  paid: boolean;
}

const MOCK_CONTACTS: ContactOutput["contacts"] = [
  { id: "c1", name: "Sarah Chen", email: "sarah@techcorp.io", company: "TechCorp", role: "VP of Engineering", personaId: "p1" },
  { id: "c2", name: "Marcus Johnson", email: "marcus@dataflow.com", company: "DataFlow Inc", role: "CTO", personaId: "p1" },
  { id: "c3", name: "Lisa Park", email: "lisa@scaleup.co", company: "ScaleUp", role: "Head of Product", personaId: "p2" },
  { id: "c4", name: "David Kim", email: "david@cloudnine.io", company: "CloudNine", role: "Engineering Manager", personaId: "p1" },
  { id: "c5", name: "Rachel Torres", email: "rachel@nextstep.com", company: "NextStep AI", role: "Director of Ops", personaId: "p2" },
  { id: "c6", name: "James Wright", email: "james@bytewise.dev", company: "ByteWise", role: "CTO", personaId: "p1" },
  { id: "c7", name: "Nina Patel", email: "nina@growthloop.io", company: "GrowthLoop", role: "VP Product", personaId: "p2" },
  { id: "c8", name: "Tom Anderson", email: "tom@infrabuild.com", company: "InfraBuild", role: "Principal Engineer", personaId: "p1" },
];

const MOCK_PIPELINES: Record<string, { email: TaskStatus; phone: TaskStatus; paid: boolean }> = {
  c1: { email: "completed", phone: "completed", paid: true },
  c2: { email: "completed", phone: "completed", paid: false },
  c3: { email: "completed", phone: "running", paid: false },
  c4: { email: "completed", phone: "pending", paid: false },
  c5: { email: "completed", phone: "failed", paid: false },
  c6: { email: "running", phone: "pending", paid: false },
  c7: { email: "pending", phone: "pending", paid: false },
  c8: { email: "failed", phone: "pending", paid: false },
};

export function getMockContacts(): ContactPipeline[] {
  return MOCK_CONTACTS.map((c) => ({
    contact: c,
    ...(MOCK_PIPELINES[c.id] ?? { email: "pending" as const, phone: "pending" as const, paid: false }),
  }));
}

export const MOCK_RESEARCH: MarketResearchOutput = {
  overview:
    "The B2B developer tools market is experiencing rapid growth, driven by increasing complexity of software workflows and demand for automation. The total addressable market for developer productivity tools reached $45B in 2025.",
  marketSize: "$45B globally, growing at 18% CAGR",
  competitors: [
    { name: "LinearB", description: "Dev workflow automation", strengths: "Strong enterprise presence, solid metrics", weaknesses: "Complex pricing, slow onboarding" },
    { name: "Sleuth", description: "Deploy tracking and DORA metrics", strengths: "Simple UX, fast setup", weaknesses: "Limited integrations, narrow scope" },
    { name: "Cortex", description: "Internal developer portal", strengths: "Comprehensive feature set", weaknesses: "Heavy setup, enterprise-only pricing" },
  ],
  trends: [
    "AI-assisted development becoming table stakes",
    "Platform engineering consolidating toolchains",
    "Developer experience as competitive hiring advantage",
  ],
  opportunities: [
    "SMB segment significantly underserved by current players",
    "Integration with AI coding assistants (Copilot, Cursor)",
    "Vertical-specific solutions for regulated industries",
  ],
  risks: [
    "Market consolidation by GitHub/GitLab/Atlassian",
    "Open source alternatives gaining traction",
    "Economic uncertainty reducing dev tool budgets",
  ],
};

export const MOCK_ANALYTICS = {
  emailsSent: 6,
  replies: 3,
  replyRate: 23,
  pageVisits: 14,
  paid: 1,
  paidRate: 4,
  confidence: 72,
  conclusion:
    "Early signals are promising. Strong interest from engineering leaders, particularly in the DevOps segment. Recommend continuing outreach to reach statistical significance.",
};

export const MOCK_PAGE_URL = "https://placeholder.insforge.dev/demo-page";
