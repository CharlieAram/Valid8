import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type {
  IdeaConfirmationOutput,
  MarketResearchOutput,
  AssumptionOutput,
  PersonaOutput,
  ContactOutput,
  ResultsSummaryOutput,
  PivotProposalsOutput,
} from "@valid8/shared";
import type {
  LandingPageContent,
  PersonalizationOverrides,
  ColorTheme,
  IconType,
} from "./landing-template.js";

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
  idea: string,
  webContext: string | null
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
    prompt: `Conduct deep market research for this B2B software idea. Identify real competitors, market trends, opportunities, and risks. Be specific with names and data. Ground your analysis in the web research provided below — cite real companies, real numbers, and real trends.

Idea: ${idea}${webContext ? `\n\nWeb Research:\n${webContext}` : ""}`,
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

export async function generateLandingPageContent(
  idea: IdeaConfirmationOutput,
): Promise<LandingPageContent> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      productName: z.string().describe("Catchy product name, 1-3 words"),
      headline: z
        .string()
        .describe("Hero headline, 6-12 words, benefit-focused, punchy"),
      subheadline: z
        .string()
        .describe("1-2 sentences supporting the headline with specifics"),
      ctaText: z
        .string()
        .describe("CTA button text, 2-5 words, action-oriented"),
      painPoints: z
        .array(
          z.object({
            title: z.string().describe("3-6 word pain point title"),
            description: z.string().describe("1-2 concrete sentences"),
          }),
        )
        .min(3)
        .max(3),
      solutionIntro: z
        .string()
        .describe("One compelling sentence introducing the solution"),
      features: z
        .array(
          z.object({
            title: z.string().describe("Feature name, 2-5 words"),
            description: z.string().describe("1-2 specific sentences"),
            icon: z.enum([
              "chart",
              "shield",
              "zap",
              "target",
              "layers",
              "globe",
              "clock",
              "users",
            ] as [IconType, ...IconType[]]),
          }),
        )
        .min(3)
        .max(3),
      metrics: z
        .array(
          z.object({
            value: z
              .string()
              .describe("Impressive metric like '10x', '99.9%', '3M+'"),
            label: z.string().describe("What the metric measures, 2-5 words"),
          }),
        )
        .min(3)
        .max(3),
      finalCtaHeadline: z
        .string()
        .describe("Compelling closing headline, 5-10 words"),
      finalCtaDescription: z
        .string()
        .describe("One sentence final push to sign up"),
      colorTheme: z
        .enum([
          "blue",
          "violet",
          "emerald",
          "amber",
          "rose",
          "cyan",
        ] as [ColorTheme, ...ColorTheme[]])
        .describe("Best color for this product's industry"),
    }),
    prompt: `Generate landing page content for this B2B product. Write like a top copywriter — punchy, specific, zero fluff.

Rules:
- Headline: benefit-focused, speaks to the pain. No "revolutionize" or "transform".
- Pain points: real daily problems the target faces. Be concrete.
- Features: specific capabilities with clear outcomes.
- Metrics: aspirational but believable. Mix formats (percentages, multipliers, counts).
- Pick the icon that best represents each feature.
- Pick the color theme that fits the product's space.

Product: ${idea.summary}
Target market: ${idea.targetMarket}
Value proposition: ${idea.valueProposition}
Revenue model: ${idea.revenueModel}`,
  });
  return object as LandingPageContent;
}

export async function generatePersonalizationOverrides(
  content: LandingPageContent,
  contact: { name: string; company: string; role: string },
): Promise<PersonalizationOverrides> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      headline: z
        .string()
        .describe("Personalized headline referencing their role or company"),
      subheadline: z
        .string()
        .describe("Personalized subheadline for this prospect"),
      ctaText: z.string().optional().describe("Optionally personalized CTA"),
      finalCtaHeadline: z
        .string()
        .optional()
        .describe("Optionally personalized final CTA headline"),
    }),
    prompt: `Personalize this landing page copy for a specific prospect. Adjust the headline and subheadline to speak directly to their role and company. Keep the same product positioning.

Contact: ${contact.name}, ${contact.role} at ${contact.company}
Current headline: ${content.headline}
Current subheadline: ${content.subheadline}
Product: ${content.productName}`,
  });
  return object;
}

export async function generateContacts(
  persona: PersonaOutput["personas"][number],
  idea: string,
  count: number = 3
): Promise<Array<{ name: string; email: string; company: string; role: string; linkedinUrl?: string }>> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      contacts: z.array(
        z.object({
          name: z.string().describe("A realistic full name"),
          email: z.string().describe("A realistic business email"),
          company: z.string().describe("A real company that fits this persona"),
          role: z.string().describe("Their specific job title"),
          linkedinUrl: z.string().optional(),
        })
      ),
    }),
    prompt: `Generate ${count} realistic synthetic contacts for outreach testing. These should be plausible people who match this target persona at real companies in this space. Use realistic names and company-appropriate email formats (e.g., firstname@company.com). These are for validation testing purposes.

Persona: ${persona.title}
Description: ${persona.description}
Target companies: ${persona.companies.join(", ")}
Pain points: ${persona.painPoints.join(", ")}

Business idea being validated: ${idea}

Generate contacts that would be real decision-makers or influencers for this type of product.`,
  });
  return object.contacts;
}

export async function generateOutreachEmail(
  contact: { name: string; company: string; role: string },
  idea: IdeaConfirmationOutput,
  pageUrl: string
): Promise<{ subject: string; body: string; html: string }> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      subject: z.string().describe("Short, compelling email subject line (no spam triggers)"),
      body: z.string().describe("Plain text email body"),
      html: z.string().describe("HTML email body with simple formatting"),
    }),
    prompt: `Write a personalized cold outreach email for B2B idea validation. The email should:
- Be concise (under 150 words)
- Reference the contact's specific role and company
- Lead with a relevant pain point or insight
- Include a soft CTA to check out the landing page
- Sound human, not templated
- NOT be salesy or pushy — this is research/validation, not a hard sell

Contact: ${contact.name}, ${contact.role} at ${contact.company}
Product: ${idea.summary}
Value proposition: ${idea.valueProposition}
Target market: ${idea.targetMarket}
Landing page URL: ${pageUrl}

The HTML should be clean and simple — no heavy design, just well-formatted text with the link.`,
  });
  return object;
}

export async function generatePivotProposals(
  idea: string,
  results: ResultsSummaryOutput,
  research: MarketResearchOutput
): Promise<PivotProposalsOutput> {
  const { object } = await generateObject({
    model,
    schema: z.object({
      pivots: z.array(
        z.object({
          idea: z.string().describe("A concise description of the pivoted business idea"),
          rationale: z.string().describe("Why this pivot makes sense given the validation data"),
          targetMarket: z.string().describe("Who this pivot targets"),
          differentiator: z.string().describe("What makes this different from the original idea and competitors"),
          confidence: z.number().min(0).max(100).describe("How confident are we this pivot is worth pursuing"),
        })
      ),
    }),
    prompt: `Based on the validation results for this B2B idea, propose 2-4 alternative business directions (pivots). Each should be grounded in signals from the validation data — objections, positive signals, and market gaps.

Only propose pivots if the data suggests them. If the original idea validated well, propose variations that could be even stronger. If it failed, propose directions informed by what the market actually wants.

Original idea: ${idea}

Validation verdict: ${results.verdict} (${results.confidence}% confidence)
Recommendation: ${results.recommendation}
Key insights: ${results.qualitative.keyInsights.join("; ")}
Common objections: ${results.qualitative.commonObjections.join("; ")}
Positive signals: ${results.qualitative.positiveSignals.join("; ")}
${results.pivotSuggestions?.length ? `Initial pivot hints: ${results.pivotSuggestions.join("; ")}` : ""}

Market context:
- Competitors: ${research.competitors.map((c) => c.name).join(", ")}
- Opportunities: ${research.opportunities.join("; ")}
- Risks: ${research.risks.join("; ")}`,
  });
  return object;
}
