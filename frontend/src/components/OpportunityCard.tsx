import { memo } from "react"
import {
  Bookmark,
  BookmarkCheck,
  Building,
  Clock,
  ExternalLink,
  MapPin,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/SectionCard"
import type { Opportunity, SavedOpportunity } from "@/types"

function getScoreColor(score: number): "default" | "secondary" | "outline" {
  if (score >= 80) return "default"
  if (score >= 60) return "secondary"
  return "outline"
}

// ---------- Search result variant ----------

interface SearchCardProps {
  opportunity: Opportunity
  onSave: () => void
  isSaved?: boolean
}

function SearchOpportunityCardInner({ opportunity, onSave, isSaved = false }: SearchCardProps) {
  const relevance = opportunity.score?.relevance ?? 0
  const samUrl = `https://sam.gov/opp/${opportunity.noticeId}/view`

  return (
    <SectionCard className="hover:border-primary/45" contentClassName="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="text-lg font-semibold leading-snug">{opportunity.title}</h3>
            <Badge variant={getScoreColor(relevance)}>{relevance}% Match</Badge>
          </div>

          <OpportunityMeta
            agency={opportunity.department || opportunity.office}
            placeOfPerformance={opportunity.placeOfPerformance}
            responseDeadline={opportunity.responseDeadLine}
            naicsCode={opportunity.naicsCode}
            setAsideDescription={opportunity.typeOfSetAsideDescription}
          />

          {opportunity.description ? (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p>
          ) : null}

          {opportunity.score ? (
            <AIAnalysisBlock reasoning={opportunity.score.reasoning} />
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

export const SearchOpportunityCard = memo(SearchOpportunityCardInner)

// ---------- Saved variant ----------

interface SavedCardProps {
  opportunity: SavedOpportunity
  onDelete: () => void
  notesSlot?: React.ReactNode
}

function SavedOpportunityCardInner({ opportunity, onDelete, notesSlot }: SavedCardProps) {
  return (
    <SectionCard className="hover:border-primary/45" contentClassName="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="text-lg font-semibold leading-snug">{opportunity.title}</h3>
            <Badge variant={getScoreColor(opportunity.relevance_score || 0)}>
              {opportunity.relevance_score || 0}% Match
            </Badge>
          </div>

          <OpportunityMeta
            agency={opportunity.agency}
            placeOfPerformance={opportunity.opportunity_data?.placeOfPerformance}
            responseDeadline={opportunity.response_deadline}
            naicsCode={opportunity.opportunity_data?.naicsCode}
            setAsideDescription={opportunity.opportunity_data?.typeOfSetAsideDescription}
          />

          {opportunity.opportunity_data?.description ? (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {opportunity.opportunity_data.description}
            </p>
          ) : null}

          {opportunity.ai_analysis ? (
            <AIAnalysisBlock reasoning={opportunity.ai_analysis.reasoning} />
          ) : null}

          {notesSlot}

          <p className="mt-3 text-xs text-muted-foreground">
            Saved on {new Date(opportunity.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {opportunity.notice_id ? (
            <Button variant="outline" size="icon" asChild>
              <a
                href={`https://sam.gov/opp/${opportunity.notice_id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on SAM.gov"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="icon" onClick={onDelete} title="Remove from saved">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

export const SavedOpportunityCard = memo(SavedOpportunityCardInner)

// ---------- Shared sub-components ----------

interface MetaProps {
  agency?: string | null
  placeOfPerformance?: { city?: string; state?: string } | null
  responseDeadline?: string | null
  naicsCode?: string | null
  setAsideDescription?: string | null
}

function OpportunityMeta({ agency, placeOfPerformance, responseDeadline, naicsCode, setAsideDescription }: MetaProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
      <div className="inline-flex items-center gap-1.5">
        <Building className="h-4 w-4" />
        {agency || "Unknown Agency"}
      </div>
      {placeOfPerformance?.city ? (
        <div className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {placeOfPerformance.city}, {placeOfPerformance.state}
        </div>
      ) : null}
      {responseDeadline ? (
        <div className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Due: {new Date(responseDeadline).toLocaleDateString()}
        </div>
      ) : null}
      {naicsCode ? <Badge variant="outline">NAICS: {naicsCode}</Badge> : null}
      {setAsideDescription ? <Badge variant="outline">{setAsideDescription}</Badge> : null}
    </div>
  )
}

function AIAnalysisBlock({ reasoning }: { reasoning: string }) {
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 p-3">
      <p className="text-sm font-semibold">AI Analysis</p>
      <p className="mt-1 text-sm text-muted-foreground">{reasoning}</p>
    </div>
  )
}
