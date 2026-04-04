import type { TaskHandler } from "../engine/types.js";
import { generateMarketResearch } from "../services/ai.js";
import { tavilySearch } from "../services/tavily.js";
import type { IdeaConfirmationOutput, MarketResearchOutput } from "@valid8/shared";

export const marketResearchHandler: TaskHandler<string, MarketResearchOutput> = {
  type: "market_research",
  dependencies: [{ kind: "after", taskType: "idea_confirmation" }],
  resolveInput: (ctx) => {
    const confirmation = ctx.getTaskOutput("idea_confirmation") as IdeaConfirmationOutput;
    return confirmation.summary;
  },
  execute: async (idea) => {
    // Run multiple Tavily searches in parallel to gather real market data
    const searches = await Promise.allSettled([
      tavilySearch(`${idea} market size TAM industry report`, { maxResults: 5, includeAnswer: true }),
      tavilySearch(`${idea} competitors landscape alternatives`, { maxResults: 5, includeAnswer: true }),
      tavilySearch(`${idea} industry trends challenges risks 2024 2025`, { maxResults: 5, includeAnswer: true }),
    ]);

    const webContext = searches
      .map((r, i) => {
        if (r.status !== "fulfilled") return "";
        const label = ["Market Size & Industry", "Competitors & Landscape", "Trends & Risks"][i];
        const { answer, results } = r.value;
        const snippets = results.map((s) => `- [${s.title}](${s.url}): ${s.content.slice(0, 300)}`).join("\n");
        return `## ${label}\n${answer ? `Summary: ${answer}\n` : ""}${snippets}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return generateMarketResearch(idea, webContext || null);
  },
};
