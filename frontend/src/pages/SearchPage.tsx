import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Filter, Search } from "lucide-react"

import { PageHeader } from "@/components/layout"
import { SearchOpportunityCard } from "@/components/OpportunityCard"
import { SearchProgressBar } from "@/components/SearchProgressBar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/ui/SectionCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProfile, useSAMKeyStatus } from "@/hooks/useProfile"
import {
  useSaveOpportunity,
  useSearchHistory,
  useSearchHistoryDetails,
  useSearchResults,
  useStartSearch,
} from "@/hooks/useSearch"
import { selectTopDisplayedOpportunities } from "@/pages/searchResults"
import { NOTICE_TYPES, SET_ASIDE_TYPES } from "@/types"
import type { Opportunity, SearchHistory } from "@/types"

const searchSchema = z.object({
  keywords: z.string().optional(),
  naics_codes: z.array(z.string()).optional(),
  ptype: z.string().optional(),
  type_of_set_aside: z.string().optional(),
  place_of_performance_state: z.string().optional(),
  posted_from: z.string().optional(),
  posted_to: z.string().optional(),
  days_back: z.coerce.number().int().min(1).max(365).default(30),
})

type SearchFormData = z.infer<typeof searchSchema>

export function SearchPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: profile } = useProfile()
  const { data: samKeyStatus } = useSAMKeyStatus()
  const { data: searchHistory } = useSearchHistory(10, 0)
  const { data: selectedSearch } = useSearchHistoryDetails(selectedSearchId)
  const startSearchMutation = useStartSearch()
  const { data: searchResults } = useSearchResults(currentJobId)
  const saveOpportunityMutation = useSaveOpportunity()

  const { register, handleSubmit, setValue, watch } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      naics_codes: profile?.primary_naics ? [profile.primary_naics, ...(profile.secondary_naics || [])] : [],
      days_back: 30,
    },
  })

  const onSubmit = async (data: SearchFormData) => {
    const payload = {
      days_back: data.days_back ?? 30,
      ...(data.keywords?.trim() ? { keywords: data.keywords.trim() } : {}),
      ...(data.naics_codes?.length ? { naics_codes: data.naics_codes } : {}),
      ...(data.ptype ? { ptype: data.ptype } : {}),
      ...(data.type_of_set_aside ? { type_of_set_aside: data.type_of_set_aside } : {}),
      ...(data.posted_from ? { posted_from: data.posted_from } : {}),
      ...(data.posted_to ? { posted_to: data.posted_to } : {}),
    }

    const result = await startSearchMutation.mutateAsync(payload)
    setCurrentJobId(result.job_id)
    setSelectedSearchId(result.search_id)
  }

  const handleSave = (opportunity: Opportunity) => {
    saveOpportunityMutation.mutate({
      notice_id: opportunity.noticeId,
      relevance_score: opportunity.score?.relevance ?? 0,
      ai_analysis: opportunity.score,
      recommendation: opportunity.score?.recommendation,
      opportunity_data: opportunity,
    })
  }

  const displayedOpportunities = selectTopDisplayedOpportunities(searchResults, selectedSearch ?? undefined)
  const totalRecords =
    searchResults?.status === "complete" ? searchResults.results?.totalRecords : selectedSearch?.results?.totalRecords

  if (!samKeyStatus?.has_key) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Opportunity Discovery"
          title="Search Opportunities"
          description="AI-powered matching across current SAM.gov opportunities."
        />
        <SectionCard title="SAM.gov API key required" description="Add your key before running quick search.">
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="Connect your SAM.gov account"
            description="To run a search, add your SAM.gov API key in Settings."
            action={
              <Button asChild>
                <Link to="/settings">Go to settings</Link>
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunity Discovery"
        title="Search Opportunities"
        description="Run a quick search and review your top-ranked opportunities."
      />

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid h-11 w-full max-w-md grid-cols-2 rounded-lg">
          <TabsTrigger value="search">New Search</TabsTrigger>
          <TabsTrigger value="history">Search History</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <SectionCard title="Search controls" description="Quick search currently uses profile context and Days Back.">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row">
                <Input
                  placeholder="Keywords (example: cloud migration, cyber operations)"
                  className="flex-1"
                  {...register("keywords")}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
                    <Filter className="mr-2 h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Filters"}
                  </Button>
                  <Button type="submit" disabled={startSearchMutation.isPending}>
                    {startSearchMutation.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="days_back">Days back</Label>
                  <Input id="days_back" type="number" min={1} max={365} {...register("days_back")} />
                </div>
              </div>

              {showFilters ? (
                <div className="grid gap-4 border-t border-border/60 pt-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Notice type</Label>
                    <Select onValueChange={(value) => setValue("ptype", value)} value={watch("ptype")}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        {NOTICE_TYPES.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Set-aside</Label>
                    <Select onValueChange={(value) => setValue("type_of_set_aside", value)} value={watch("type_of_set_aside")}>
                      <SelectTrigger>
                        <SelectValue placeholder="All set-asides" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All set-asides</SelectItem>
                        {SET_ASIDE_TYPES.map((type) => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Posted from</Label>
                    <Input type="date" {...register("posted_from")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Posted to</Label>
                    <Input type="date" {...register("posted_to")} />
                  </div>
                  <div className="space-y-2">
                    <Label>NAICS codes</Label>
                    <Input
                      placeholder="541512, 541511"
                      defaultValue={
                        profile?.primary_naics
                          ? [profile.primary_naics, ...(profile.secondary_naics || [])].join(", ")
                          : ""
                      }
                      onChange={(event) => {
                        const codes = event.target.value
                          .split(",")
                          .map((code) => code.trim())
                          .filter(Boolean)
                        setValue("naics_codes", codes)
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </form>
          </SectionCard>

          {currentJobId ? (
            <SectionCard title="Search status" description="Background search and scoring progress.">
              <SearchProgressBar
                status={searchResults?.status || "pending"}
                error={searchResults?.error}
              />
              {searchResults?.status === "complete" ? (
                displayedOpportunities.length > 0 ? (
                  <p className="mt-3 font-medium text-emerald-700 dark:text-emerald-400">
                    Showing top {displayedOpportunities.length} best matches
                    {typeof totalRecords === "number" && totalRecords > displayedOpportunities.length
                      ? ` from ${totalRecords} total opportunities.`
                      : "."}
                  </p>
                ) : (
                  <p className="mt-3 font-medium text-amber-700 dark:text-amber-400">
                    No opportunities matched this profile window. Try increasing Days back or broadening
                    NAICS/keywords in your profile.
                  </p>
                )
              ) : null}
            </SectionCard>
          ) : null}

          {displayedOpportunities.length > 0 ? (
            <section className="content-reveal space-y-3">
              <h2 className="font-display text-2xl">Results ({displayedOpportunities.length})</h2>
              <div className="space-y-3">
                {displayedOpportunities.map((opportunity) => (
                  <SearchOpportunityCard
                    key={opportunity.noticeId}
                    opportunity={opportunity}
                    onSave={() => handleSave(opportunity)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="history">
          <SectionCard title="Search history" description="Open previous searches and review cached top matches.">
            {searchHistory?.length ? (
              <div className="space-y-2">
                {searchHistory.map((search: SearchHistory) => (
                  <div
                    key={search.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">Search #{search.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{new Date(search.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{search.total_results} results</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentJobId(null)
                          setSelectedSearchId(search.id)
                        }}
                      >
                        View Results
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No history yet" description="Run your first search to build your activity history." />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
