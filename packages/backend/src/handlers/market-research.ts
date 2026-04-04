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
    const year = new Date().getFullYear();
    const queries = [
      { label: "Market Size & Industry", query: `${idea} market size TAM industry report` },
      { label: "Competitors & Landscape", query: `${idea} competitors landscape alternatives` },
      { label: "Trends & Risks", query: `${idea} industry trends challenges risks ${year - 1} ${year}` },
    ];

    const searches = await Promise.allSettled(
      queries.map((q) => tavilySearch(q.query, { maxResults: 5, includeAnswer: true }))
    );

    const webContext = searches
      .map((r, i) => {
        if (r.status !== "fulfilled") return "";
        const { answer, results } = r.value;
        const snippets = results.map((s) => `- [${s.title}](${s.url}): ${s.content.slice(0, 300)}`).join("\n");
        return `## ${queries[i].label}\n${answer ? `Summary: ${answer}\n` : ""}${snippets}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return generateMarketResearch(idea, webContext || null);
  },
};
