import type { Opportunity, SearchHistoryDetail, SearchStatusResponse } from "@/types"

export const QUICK_SEARCH_DISPLAY_LIMIT = 10

export function selectTopDisplayedOpportunities(
  searchResults?: SearchStatusResponse | null,
  selectedSearch?: SearchHistoryDetail | null,
  limit: number = QUICK_SEARCH_DISPLAY_LIMIT
): Opportunity[] {
  const source =
    searchResults?.status === "complete"
      ? searchResults.results?.opportunities || []
      : selectedSearch?.results?.opportunities || []
  return source.slice(0, limit)
}

export function getOpportunityRelevance(opportunity: Opportunity): number {
  return opportunity.score?.relevance ?? 0
}
