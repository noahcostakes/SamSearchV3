import { Link } from "react-router-dom"
import {
  Search,
  Bookmark,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useSAMKeyStatus } from "@/hooks/useProfile"
import { useSearchHistory, useSavedOpportunities } from "@/hooks/useSearch"
import { useAuthStore } from "@/stores/authStore"

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: samKeyStatus, isLoading: samKeyLoading } = useSAMKeyStatus()
  const { data: searchHistory, isLoading: historyLoading } = useSearchHistory(1, 5)
  const { data: savedOpportunities, isLoading: savedLoading } = useSavedOpportunities(1, 5)

  const hasProfile = profile?.company_name && profile?.primary_naics
  const hasSAMKey = samKeyStatus?.has_key

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your government contract searches.
        </p>
      </div>

      {/* Setup Alerts */}
      {(!hasProfile || !hasSAMKey) && !profileLoading && !samKeyLoading && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Complete Your Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!hasProfile && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Complete your company profile to get AI-matched opportunities</span>
                <Link to="/profile">
                  <Button size="sm" variant="outline">
                    Complete Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
            {!hasSAMKey && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Add your SAM.gov API key to start searching</span>
                <Link to="/settings">
                  <Button size="sm" variant="outline">
                    Add API Key
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{searchHistory?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Opportunities</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {savedLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{savedOpportunities?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NAICS Codes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{(profile?.secondary_naics?.length || 0) + 1}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {samKeyLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : hasSAMKey ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Not Configured</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Search</CardTitle>
            <CardDescription>
              Start a new AI-powered search for government contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/search">
              <Button className="w-full">
                <Search className="mr-2 h-4 w-4" />
                New Search
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your most recent search activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : searchHistory?.items?.length ? (
              <ul className="space-y-2">
                {searchHistory.items.slice(0, 3).map((search) => (
                  <li key={search.id} className="text-sm flex justify-between">
                    <span className="truncate">
                      Search #{search.id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {search.total_results || 0} results
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No searches yet. Start your first search!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved Opportunities Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Saved Opportunities</CardTitle>
            <CardDescription>
              Opportunities you've saved for later review
            </CardDescription>
          </div>
          <Link to="/saved">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {savedLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : savedOpportunities?.items?.length ? (
            <div className="space-y-4">
              {savedOpportunities.items.slice(0, 3).map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{opp.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {opp.agency}
                    </p>
                  </div>
                  {opp.relevance_score && (
                    <Badge
                      variant={
                        opp.relevance_score >= 80
                          ? "default"
                          : opp.relevance_score >= 60
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {opp.relevance_score}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved opportunities yet. Search and save opportunities that interest you!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
