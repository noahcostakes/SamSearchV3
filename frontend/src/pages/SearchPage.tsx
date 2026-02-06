import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Search,
  Filter,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Clock,
  Building,
  MapPin,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useStartSearch,
  useSearchResults,
  useSaveOpportunity,
  useSearchHistory,
} from "@/hooks/useSearch"
import { useProfile, useSAMKeyStatus } from "@/hooks/useProfile"
import type { Opportunity, SearchHistory } from "@/types"
import { NOTICE_TYPES, SET_ASIDE_TYPES } from "@/types"

const searchSchema = z.object({
  keywords: z.string().optional(),
  naics_codes: z.array(z.string()).optional(),
  ptype: z.string().optional(),
  type_of_set_aside: z.string().optional(),
  place_of_performance_state: z.string().optional(),
  posted_from: z.string().optional(),
  posted_to: z.string().optional(),
})

type SearchFormData = z.infer<typeof searchSchema>

export function SearchPage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: profile } = useProfile()
  const { data: samKeyStatus } = useSAMKeyStatus()
  const { data: searchHistory } = useSearchHistory(1, 10)
  const startSearchMutation = useStartSearch()
  const { data: searchResults, isLoading: resultsLoading } = useSearchResults(currentJobId)
  const saveOpportunityMutation = useSaveOpportunity()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      naics_codes: profile?.primary_naics ? [profile.primary_naics, ...(profile.secondary_naics || [])] : [],
    },
  })

  const onSubmit = async (data: SearchFormData) => {
    const result = await startSearchMutation.mutateAsync({
      keywords: data.keywords,
      naics_codes: data.naics_codes?.filter(Boolean),
      ptype: data.ptype || undefined,
      type_of_set_aside: data.type_of_set_aside || undefined,
      place_of_performance_state: data.place_of_performance_state || undefined,
      posted_from: data.posted_from || undefined,
      posted_to: data.posted_to || undefined,
    })
    setCurrentJobId(result.job_id)
  }

  const handleSave = (opportunity: Opportunity) => {
    saveOpportunityMutation.mutate({
      notice_id: opportunity.noticeId,
      title: opportunity.title,
      agency: opportunity.department,
      posted_date: opportunity.postedDate,
      response_deadline: opportunity.responseDeadLine,
      opportunity_data: opportunity,
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "outline"
  }

  if (!samKeyStatus?.has_key) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Opportunities</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered search across SAM.gov contracts
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">SAM.gov API Key Required</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              To search for opportunities, please add your SAM.gov API key in Settings.
            </p>
            <Button asChild>
              <a href="/settings">Go to Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Opportunities</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered search across SAM.gov contracts
        </p>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">New Search</TabsTrigger>
          <TabsTrigger value="history">Search History</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search SAM.gov
              </CardTitle>
              <CardDescription>
                Enter keywords and filters to find matching opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search keywords (e.g., IT support, cloud migration)..."
                      {...register("keywords")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                  <Button type="submit" disabled={startSearchMutation.isPending}>
                    {startSearchMutation.isPending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Notice Type</Label>
                      <Select
                        onValueChange={(value) => setValue("ptype", value)}
                        value={watch("ptype")}
                      >
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
                      <Label>Set-Aside</Label>
                      <Select
                        onValueChange={(value) => setValue("type_of_set_aside", value)}
                        value={watch("type_of_set_aside")}
                      >
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
                      <Label>Posted From</Label>
                      <Input
                        type="date"
                        {...register("posted_from")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Posted To</Label>
                      <Input
                        type="date"
                        {...register("posted_to")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NAICS Codes</Label>
                      <Input
                        placeholder="541512, 541511"
                        onChange={(e) => {
                          const codes = e.target.value.split(",").map((c) => c.trim())
                          setValue("naics_codes", codes)
                        }}
                        defaultValue={profile?.primary_naics ? [profile.primary_naics, ...(profile.secondary_naics || [])].join(", ") : ""}
                      />
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Search Status */}
          {currentJobId && (
            <Card>
              <CardHeader>
                <CardTitle>Search Status</CardTitle>
              </CardHeader>
              <CardContent>
                {resultsLoading || searchResults?.status === "pending" || searchResults?.status === "processing" || searchResults?.status === "searching" || searchResults?.status === "scoring" ? (
                  <div className="flex items-center gap-4">
                    <Spinner />
                    <div>
                      <p className="font-medium">
                        {searchResults?.status === "searching" ? "Searching SAM.gov..." : 
                         searchResults?.status === "scoring" ? "Scoring opportunities with AI..." : 
                         "Processing..."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This may take a moment as we search and score opportunities.
                      </p>
                    </div>
                  </div>
                ) : searchResults?.status === "complete" ? (
                  <div className="text-green-600">
                    ✓ Search complete! Found {searchResults.results?.opportunities?.length || 0} opportunities.
                  </div>
                ) : searchResults?.status === "failed" ? (
                  <div className="text-red-600">
                    ✗ Search failed: {searchResults.error || "Unknown error"}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {searchResults?.results?.opportunities && searchResults.results.opportunities.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Results ({searchResults.results.opportunities.length})
              </h2>
              {searchResults.results.opportunities.map((opportunity: Opportunity) => (
                <OpportunityCard
                  key={opportunity.noticeId}
                  opportunity={opportunity}
                  onSave={() => handleSave(opportunity)}
                  getScoreColor={getScoreColor}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {searchHistory?.items?.length ? (
            searchHistory.items.map((search: SearchHistory) => (
              <Card key={search.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">
                      Search #{search.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(search.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{search.total_results} results</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentJobId(search.id)}
                    >
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No search history yet. Start a new search above.
              </CardContent>
            </Card>
          )}
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
  const samUrl = opportunity.solicitationNumber 
    ? `https://sam.gov/opp/${opportunity.noticeId}/view` 
    : `https://sam.gov/opp/${opportunity.noticeId}/view`
    
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <h3 className="font-semibold text-lg line-clamp-2">
                {opportunity.title}
              </h3>
              {opportunity.score && (
                <Badge variant={getScoreColor(opportunity.score.relevance)}>
                  {opportunity.score.relevance}% Match
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {opportunity.department || opportunity.office || "Unknown Agency"}
              </div>
              {opportunity.placeOfPerformance && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {opportunity.placeOfPerformance.city}, {opportunity.placeOfPerformance.state}
                </div>
              )}
              {opportunity.responseDeadLine && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Due: {new Date(opportunity.responseDeadLine).toLocaleDateString()}
                </div>
              )}
              {opportunity.naicsCode && (
                <Badge variant="outline">NAICS: {opportunity.naicsCode}</Badge>
              )}
              {opportunity.typeOfSetAsideDescription && (
                <Badge variant="outline">{opportunity.typeOfSetAsideDescription}</Badge>
              )}
            </div>

            {opportunity.description && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                {opportunity.description}
              </p>
            )}

            {opportunity.score && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">AI Analysis:</p>
                <p className="text-sm text-muted-foreground">
                  {opportunity.score.reasoning}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onSave}
              title={isSaved ? "Saved" : "Save opportunity"}
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a
                href={samUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on SAM.gov"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
