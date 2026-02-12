import { describe, expect, it } from "vitest"

import type { Opportunity, SearchStatusResponse } from "@/types"
import {
  getOpportunityRelevance,
  selectTopDisplayedOpportunities,
} from "@/pages/searchResults"

function makeOpportunity(index: number, score?: number): Opportunity {
  return {
    noticeId: `id-${index.toString().padStart(2, "0")}`,
    title: `Opportunity ${index}`,
    score:
      typeof score === "number"
        ? {
            relevance: score,
            confidence: 50,
            recommendation: "watch",
            reasoning: "ok",
            strengths: [],
            weaknesses: [],
            key_requirements: [],
          }
        : undefined,
  }
}

describe("search result helpers", () => {
  it("returns max 10 opportunities from status payload", () => {
    const status: SearchStatusResponse = {
      status: "complete",
      progress: 100,
      results: {
        totalRecords: 25,
        opportunities: Array.from({ length: 25 }, (_, i) => makeOpportunity(i, 100 - i)),
        searchParams: { days_back: 30 },
        high_relevance_count: 10,
        medium_relevance_count: 10,
        low_relevance_count: 5,
      },
    }

    const displayed = selectTopDisplayedOpportunities(status, null)
    expect(displayed).toHaveLength(10)
  })

  it("trims legacy history payloads over 10", () => {
    const history = {
      id: "search-1",
      status: "complete",
      search_params: { days_back: 30 },
      total_results: 15,
      high_relevance_count: 1,
      medium_relevance_count: 2,
      low_relevance_count: 12,
      results: {
        totalRecords: 15,
        opportunities: Array.from({ length: 15 }, (_, i) => makeOpportunity(i)),
        searchParams: { days_back: 30 },
      },
      created_at: new Date().toISOString(),
    }

    const displayed = selectTopDisplayedOpportunities(undefined, history)
    expect(displayed).toHaveLength(10)
  })

  it("returns 0 relevance when score is missing", () => {
    const opportunity = makeOpportunity(1)
    expect(getOpportunityRelevance(opportunity)).toBe(0)
  })
})
