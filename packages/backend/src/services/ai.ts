import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type {
  IdeaConfirmationOutput,
  MarketResearchOutput,
  AssumptionOutput,
  PersonaOutput,
  ResultsSummaryOutput,
} from "@valid8/shared";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic(process.env.AI_MODEL ?? "claude-sonnet-4-20250514");

export async function generateIdeaConfirmation(
  ideaText: string
): Promise<IdeaConfirmationOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      summary: z.string().describe("A clear 2-3 sentence summary of the business idea"),
      targetMarket: z.string().describe("Who this is for"),
      valueProposition: z.string().describe("What value it delivers"),
      revenueModel: z.string().describe("How it makes money"),
    }),
    prompt: `You are helping validate a B2B software business idea. Analyze this idea and produce a structured understanding of it. Be specific and concise.

Idea: ${ideaText}`,
  });
  return object;
}

export async function generateMarketResearch(
  idea: string
): Promise<MarketResearchOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      overview: z.string(),
      marketSize: z.string(),
      competitors: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          strengths: z.string(),
          weaknesses: z.string(),
        })
      ),
      trends: z.array(z.string()),
      opportunities: z.array(z.string()),
      risks: z.array(z.string()),
    }),
    prompt: `Conduct deep market research for this B2B software idea. Identify real competitors, market trends, opportunities, and risks. Be specific with names and data.

Idea: ${idea}`,
  });
  return object;
}

export async function generateAssumptions(
  idea: string,
  research: MarketResearchOutput
): Promise<AssumptionOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      assumptions: z.array(
        z.object({
          id: z.string(),
          statement: z.string().describe("A testable hypothesis: 'We believe that...'"),
          category: z.enum(["desirability", "feasibility", "viability"]),
          criticality: z.enum(["high", "medium", "low"]),
        })
      ),
    }),
    prompt: `Based on this B2B idea and market research, generate testable assumptions following lean startup methodology. Focus on "What has to be true for this business to work?"

Idea: ${idea}

Market Research:
${JSON.stringify(research, null, 2)}`,
  });
  return object;
}

export async function generatePersonas(
  idea: string,
  assumptions: AssumptionOutput
): Promise<PersonaOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      personas: z.array(
        z.object({
          id: z.string(),
          title: z.string().describe("e.g. 'VP of Engineering at Series B SaaS'"),
          description: z.string(),
          jobsToBeDone: z.array(z.string()),
          painPoints: z.array(z.string()),
          companies: z.array(z.string()).describe("Types of companies or specific company names"),
        })
      ),
    }),
    prompt: `Identify 3-5 target customer personas for this B2B idea. For each, define their jobs-to-be-done and pain points that this product would address. Be specific about company types.

Idea: ${idea}

Assumptions to validate:
${JSON.stringify(assumptions.assumptions, null, 2)}`,
  });
  return object;
}

export async function generateResultsSummary(
  idea: string,
  taskOutputs: Record<string, unknown>
): Promise<ResultsSummaryOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      verdict: z.enum(["validated", "invalidated", "inconclusive"]),
      confidence: z.number().min(0).max(100),
      quantitative: z.object({
        emailsSent: z.number(),
        emailsOpened: z.number(),
        pageVisits: z.number(),
        signups: z.number(),
        callsScheduled: z.number(),
        callsCompleted: z.number(),
      }),
      qualitative: z.object({
        keyInsights: z.array(z.string()),
        commonObjections: z.array(z.string()),
        positiveSignals: z.array(z.string()),
      }),
      recommendation: z.string(),
      pivotSuggestions: z.array(z.string()).optional(),
    }),
    prompt: `Analyze the validation results for this B2B idea and provide a clear verdict.

Idea: ${idea}

All collected data:
${JSON.stringify(taskOutputs, null, 2)}`,
  });
  return object;
}
