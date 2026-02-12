import { Link } from "react-router-dom"
import { AlertCircle, ArrowRight, Bookmark, Clock, Search, TrendingUp } from "lucide-react"

import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/StatCard"
import { useProfile, useSAMKeyStatus } from "@/hooks/useProfile"
import { useSavedOpportunities, useSearchHistory } from "@/hooks/useSearch"
import { useAuthStore } from "@/stores/authStore"

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: samKeyStatus, isLoading: samKeyLoading } = useSAMKeyStatus()
  const { data: searchHistory, isLoading: historyLoading } = useSearchHistory(5, 0)
  const { data: savedOpportunities, isLoading: savedLoading } = useSavedOpportunities(5, 0)

  const hasProfile = Boolean(profile?.company_name && profile?.primary_naics)
  const hasSAMKey = Boolean(samKeyStatus?.has_key)
  const userName = user?.email ? user.email.split("@")[0] : "there"
  const naicsCount = profile?.primary_naics ? (profile.secondary_naics?.length || 0) + 1 : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${userName}`}
        description="Track readiness, launch searches, and review your latest opportunities."
      />

      {!hasProfile || !hasSAMKey ? (
        <SectionCard
          className="border-amber-300/80 bg-amber-50/80"
          title={
            <span className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              Complete Setup
            </span>
          }
          description="Finish these items to unlock better AI matching accuracy."
        >
          <div className="space-y-3">
            {!hasProfile ? (
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-amber-200 bg-white/70 p-3 sm:flex-row sm:items-center">
                <p className="text-sm text-amber-950">Complete your company profile for profile-driven relevance scoring.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/profile">
                    Complete profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
            {!hasSAMKey ? (
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-amber-200 bg-white/70 p-3 sm:flex-row sm:items-center">
                <p className="text-sm text-amber-950">Add your SAM.gov API key to start running opportunity searches.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/settings">
                    Add API key
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <section className="stagger-enter grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Searches"
          icon={<Search className="h-4 w-4" />}
          value={historyLoading ? <Skeleton className="h-8 w-14" /> : searchHistory?.length || 0}
        />
        <StatCard
          label="Saved Opportunities"
          icon={<Bookmark className="h-4 w-4" />}
          value={savedLoading ? <Skeleton className="h-8 w-14" /> : savedOpportunities?.length || 0}
        />
        <StatCard
          label="NAICS Coverage"
          icon={<TrendingUp className="h-4 w-4" />}
          value={profileLoading ? <Skeleton className="h-8 w-14" /> : naicsCount}
        />
        <StatCard
          label="SAM API Status"
          icon={<Clock className="h-4 w-4" />}
          value={
            samKeyLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : hasSAMKey ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Missing</Badge>
            )
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Quick Search" description="Start a new AI-powered search across SAM.gov opportunities.">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Start a new search
            </Link>
          </Button>
        </SectionCard>

        <SectionCard title="Recent Activity" description="Most recent searches from your workspace.">
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : searchHistory?.length ? (
            <ul className="space-y-2">
              {searchHistory.slice(0, 3).map((search) => (
                <li key={search.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <span className="truncate">Search #{search.id.slice(0, 8)}</span>
                  <Badge variant="outline">{search.total_results || 0} results</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No searches yet" description="Run your first quick search to populate this activity feed." />
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Saved Opportunities"
        description="Latest opportunities you've bookmarked for review."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/saved">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        {savedLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="rounded-lg border border-border/60 p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : savedOpportunities?.length ? (
          <div className="space-y-3">
            {savedOpportunities.slice(0, 3).map((opportunity) => (
              <div key={opportunity.id} className="flex flex-col justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{opportunity.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{opportunity.agency || "Unknown agency"}</p>
                </div>
                <Badge
                  variant={
                    opportunity.relevance_score >= 80
                      ? "default"
                      : opportunity.relevance_score >= 60
                      ? "secondary"
                      : "outline"
                  }
                >
                  {opportunity.relevance_score}% match
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved opportunities"
            description="Save opportunities from search results to review them here."
            action={
              <Button asChild variant="outline">
                <Link to="/search">Start searching</Link>
              </Button>
            }
          />
        )}
      </SectionCard>
    </div>
  )
}
