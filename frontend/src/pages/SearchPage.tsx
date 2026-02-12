import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Bookmark,
  BookmarkCheck,
  Building,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Search,
} from "lucide-react"

import { PageHeader } from "@/components/layout"
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
import { getOpportunityRelevance, selectTopDisplayedOpportunities } from "@/pages/searchResults"
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
  const { data: searchResults, isLoading: resultsLoading } = useSearchResults(currentJobId)
  const saveOpportunityMutation = useSaveOpportunity()

  const { register, handleSubmit, setValue, watch } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      naics_codes: profile?.primary_naics ? [profile.primary_naics, ...(profile.secondary_naics || [])] : [],
      days_back: 30,
    },
  })

  const onSubmit = async (data: SearchFormData) => {
    const result = await startSearchMutation.mutateAsync({
      days_back: data.days_back ?? 30,
    })
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "outline"
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
                  <p className="md:col-span-2 lg:col-span-3 text-sm text-muted-foreground">
                    Advanced filters are preview-only right now. Current quick search uses your profile and Days Back.
                  </p>
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
              {resultsLoading ||
              searchResults?.status === "pending" ||
              searchResults?.status === "processing" ||
              searchResults?.status === "searching" ||
              searchResults?.status === "scoring" ? (
                <div className="flex items-center gap-3">
                  <Spinner />
                  <div>
                    <p className="font-semibold">
                      {searchResults?.status === "searching"
                        ? "Searching SAM.gov..."
                        : searchResults?.status === "scoring"
                        ? "Scoring opportunities with AI..."
                        : "Processing..."}
                    </p>
                    <p className="text-sm text-muted-foreground">This can take a moment for larger result sets.</p>
                  </div>
                </div>
              ) : searchResults?.status === "complete" ? (
                displayedOpportunities.length > 0 ? (
                  <p className="font-medium text-emerald-700">
                    Search complete. Showing top {displayedOpportunities.length} best matches
                    {typeof totalRecords === "number" && totalRecords > displayedOpportunities.length
                      ? ` from ${totalRecords} total opportunities.`
                      : "."}
                  </p>
                ) : (
                  <p className="font-medium text-amber-700">
                    Search complete, but no opportunities matched this profile window. Try increasing Days back or
                    broadening NAICS/keywords in your profile.
                  </p>
                )
              ) : searchResults?.status === "failed" ? (
                <p className="font-medium text-destructive">
                  Search failed: {searchResults.error || "Unknown error"}
                </p>
              ) : null}
            </SectionCard>
          ) : null}

          {displayedOpportunities.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-2xl">Results ({displayedOpportunities.length})</h2>
              <div className="space-y-3">
                {displayedOpportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.noticeId}
                    opportunity={opportunity}
                    onSave={() => handleSave(opportunity)}
                    getScoreColor={getScoreColor}
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

interface OpportunityCardProps {
  opportunity: Opportunity
  onSave: () => void
  getScoreColor: (score: number) => "default" | "secondary" | "outline"
  isSaved?: boolean
}

function OpportunityCard({ opportunity, onSave, getScoreColor, isSaved = false }: OpportunityCardProps) {
  const relevance = getOpportunityRelevance(opportunity)
  const samUrl = `https://sam.gov/opp/${opportunity.noticeId}/view`

  return (
    <SectionCard className="hover:border-primary/45" contentClassName="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="font-semibold text-lg leading-snug">{opportunity.title}</h3>
            <Badge variant={getScoreColor(relevance)}>{relevance}% Match</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              {opportunity.department || opportunity.office || "Unknown Agency"}
            </div>
            {opportunity.placeOfPerformance ? (
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {opportunity.placeOfPerformance.city}, {opportunity.placeOfPerformance.state}
              </div>
            ) : null}
            {opportunity.responseDeadLine ? (
              <div className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Due: {new Date(opportunity.responseDeadLine).toLocaleDateString()}
              </div>
            ) : null}
            {opportunity.naicsCode ? <Badge variant="outline">NAICS: {opportunity.naicsCode}</Badge> : null}
            {opportunity.typeOfSetAsideDescription ? (
              <Badge variant="outline">{opportunity.typeOfSetAsideDescription}</Badge>
            ) : null}
          </div>

          {opportunity.description ? (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p>
          ) : null}

          {opportunity.score ? (
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 p-3">
              <p className="text-sm font-semibold">AI Analysis</p>
              <p className="mt-1 text-sm text-muted-foreground">{opportunity.score.reasoning}</p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button variant="outline" size="icon" onClick={onSave} title={isSaved ? "Saved" : "Save opportunity"}>
            {isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={samUrl} target="_blank" rel="noopener noreferrer" title="View on SAM.gov">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}
