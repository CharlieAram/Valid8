/**
 * Tavily Search API — web search tuned for LLM/agents.
 * Docs: https://docs.tavily.com/documentation/api-reference/endpoint/search
 *
 * Set TAVILY_API_KEY in the repo root `.env` (backend loads ../../.env).
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

export async function tavilySearch(
  query: string,
  options?: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced" | "fast" | "ultra-fast";
    includeAnswer?: boolean;
  }
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set in .env");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options?.searchDepth ?? "basic",
      max_results: options?.maxResults ?? 8,
      include_answer: options?.includeAnswer ?? true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Tavily HTTP ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as {
    query?: string;
    answer?: string;
    results?: TavilySearchResult[];
  };

  return {
    query: data.query ?? query,
    answer: data.answer,
    results: data.results ?? [],
  };
}
