// ============================================
// MOCK DATA — Replace with real API data as services are integrated
//
// Each section maps to a backend integration point:
//   Contacts & pipeline → packages/backend/src/handlers/contact-discovery.ts
//   Email status        → packages/backend/src/services/agentsmail.ts
//   Phone status        → packages/backend/src/services/elevenlabs.ts
//   Website / page URL  → packages/backend/src/services/insforge.ts
//   Analytics           → packages/backend/src/handlers/results-summary.ts
//   Market research     → packages/backend/src/handlers/market-research.ts
//   Call insights       → packages/backend/src/handlers/voice-call.ts (transcript parsing)
//
// To remove mock data: delete fallback references in pages/WorkflowView.tsx
// ============================================

import type { ContactOutput, TaskStatus } from "@valid8/shared";

export interface ContactPipeline {
  contact: ContactOutput["contacts"][number];
  email: TaskStatus;
  phone: TaskStatus;
  paid: boolean;
}

// ---------------------------------------------------------------------------
// Qualitative insights — structured data extracted from voice calls.
// Maps to the call script at callScript.md:
//   1. Top problems in role
//   2. Do they have problem Y
//   3. Dollar value of problem
//   4. Why hasn't it been solved
//   5. Reaction to our solution
//   6. Willingness to arrange a sales call
// ---------------------------------------------------------------------------

export interface CallInsight {
  contactName: string;
  topProblems: string[];
  hasProblem: boolean;
  problemValueUsd: number | null;
  whyUnsolved: string;
  solutionReaction: { positive: boolean; comment: string };
  willingToTalk: boolean;
}

export interface QualitativeInsights {
  callInsights: CallInsight[];
  problemValueAvg: number | null;
  problemValueMin: number | null;
  problemValueMax: number | null;
  problemRecognitionRate: number;
  solutionApprovalRate: number;
  salesCallRate: number;
  topProblemsAggregate: string[];
  topUnsolved: string[];
  topObjections: string[];
  topPositiveSignals: string[];
}

export const MOCK_CALL_INSIGHTS: CallInsight[] = [
  {
    contactName: "Sarah Chen",
    topProblems: ["Hiring takes 3+ months per role", "Bad culture fit causes 40% attrition", "Résumés don't predict performance"],
    hasProblem: true,
    problemValueUsd: 120_000,
    whyUnsolved: "Existing tools focus on skills, not values alignment. No one's cracked culture-fit matching at scale.",
    solutionReaction: { positive: true, comment: "This is exactly what we've been trying to build internally." },
    willingToTalk: true,
  },
  {
    contactName: "Marcus Johnson",
    topProblems: ["Remote hiring is a black box", "Interviewer bias distorts decisions", "Onboarding failures are expensive"],
    hasProblem: true,
    problemValueUsd: 85_000,
    whyUnsolved: "Interview processes are deeply ingrained. People trust gut feeling over data.",
    solutionReaction: { positive: true, comment: "Interesting angle. Would need to see evidence it outperforms structured interviews." },
    willingToTalk: true,
  },
  {
    contactName: "Lisa Park",
    topProblems: ["Pipeline quality is low", "Sourcing diverse candidates is hard", "Time-to-fill keeps increasing"],
    hasProblem: false,
    problemValueUsd: null,
    whyUnsolved: "We use a referral-heavy model so culture fit isn't really our bottleneck.",
    solutionReaction: { positive: false, comment: "Not a priority for us right now — referrals work well enough." },
    willingToTalk: false,
  },
  {
    contactName: "David Kim",
    topProblems: ["Senior eng hires keep churning", "Team dynamics break when we grow", "Can't assess leadership potential"],
    hasProblem: true,
    problemValueUsd: 200_000,
    whyUnsolved: "Leadership coaching exists but nothing pre-hire. The data simply hasn't been connected.",
    solutionReaction: { positive: true, comment: "If this works, it saves us a fortune in re-hiring." },
    willingToTalk: true,
  },
  {
    contactName: "Rachel Torres",
    topProblems: ["Scaling ops team while maintaining quality", "Contractor-to-FTE conversion rate is low", "Training costs are high"],
    hasProblem: true,
    problemValueUsd: 60_000,
    whyUnsolved: "Most tools are built for tech hiring. Ops roles get ignored by HR tech vendors.",
    solutionReaction: { positive: true, comment: "Would depend on whether it works for non-technical roles too." },
    willingToTalk: false,
  },
];

function buildQualitativeInsights(insights: CallInsight[]): QualitativeInsights {
  const withValue = insights.filter((c) => c.problemValueUsd != null);
  const values = withValue.map((c) => c.problemValueUsd!);
  const hasProblem = insights.filter((c) => c.hasProblem);
  const positive = insights.filter((c) => c.solutionReaction.positive);
  const willing = insights.filter((c) => c.willingToTalk);

  const allProblems = insights.flatMap((c) => c.topProblems);
  const problemFreq = new Map<string, number>();
  for (const p of allProblems) problemFreq.set(p, (problemFreq.get(p) ?? 0) + 1);
  const topProblems = [...problemFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p);

  return {
    callInsights: insights,
    problemValueAvg: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    problemValueMin: values.length ? Math.min(...values) : null,
    problemValueMax: values.length ? Math.max(...values) : null,
    problemRecognitionRate: insights.length ? Math.round((hasProblem.length / insights.length) * 100) : 0,
    solutionApprovalRate: insights.length ? Math.round((positive.length / insights.length) * 100) : 0,
    salesCallRate: insights.length ? Math.round((willing.length / insights.length) * 100) : 0,
    topProblemsAggregate: topProblems,
    topUnsolved: insights.map((c) => c.whyUnsolved),
    topObjections: insights.filter((c) => !c.solutionReaction.positive).map((c) => c.solutionReaction.comment),
    topPositiveSignals: insights.filter((c) => c.solutionReaction.positive).map((c) => c.solutionReaction.comment),
  };
}

export const MOCK_QUALITATIVE = buildQualitativeInsights(MOCK_CALL_INSIGHTS);

export { buildQualitativeInsights };
