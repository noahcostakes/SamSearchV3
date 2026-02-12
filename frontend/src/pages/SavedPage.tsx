import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Bookmark,
  Check,
  Clock,
  Edit,
  ExternalLink,
  MapPin,
  Trash2,
  X,
  Building,
} from "lucide-react"

import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useSavedOpportunities,
  useUnsaveOpportunity,
  useUpdateOpportunityNotes,
} from "@/hooks/useSearch"
import type { SavedOpportunity } from "@/types"

export function SavedPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<SavedOpportunity | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")

  const { data: savedOpportunities, isLoading } = useSavedOpportunities(50, 0)
  const unsaveOpportunityMutation = useUnsaveOpportunity()
  const updateNotesMutation = useUpdateOpportunityNotes()

  const handleDelete = (opportunity: SavedOpportunity) => {
    setSelectedOpportunity(opportunity)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedOpportunity) {
      unsaveOpportunityMutation.mutate(selectedOpportunity.id)
      setDeleteDialogOpen(false)
      setSelectedOpportunity(null)
    }
  }

  const startEditingNotes = (opportunity: SavedOpportunity) => {
    setEditingNotes(opportunity.id)
    setNotesValue(opportunity.user_notes || "")
  }

  const saveNotes = (opportunityId: string) => {
    updateNotesMutation.mutate({ opportunityId, notes: notesValue })
    setEditingNotes(null)
  }

  const cancelEditingNotes = () => {
    setEditingNotes(null)
    setNotesValue("")
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "outline"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Saved Opportunities"
        description="Track shortlisted opportunities and capture your internal notes."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <SectionCard key={key}>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
            </SectionCard>
          ))}
        </div>
      ) : savedOpportunities?.length ? (
        <div className="space-y-3">
          {savedOpportunities.map((opportunity) => (
            <SectionCard key={opportunity.id} className="hover:border-primary/45" contentClassName="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="text-lg font-semibold leading-snug">{opportunity.title}</h3>
                    <Badge variant={getScoreColor(opportunity.relevance_score || 0)}>
                      {(opportunity.relevance_score || 0)}% Match
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-1.5">
                      <Building className="h-4 w-4" />
                      {opportunity.agency || "Unknown Agency"}
                    </div>
                    {opportunity.opportunity_data?.placeOfPerformance ? (
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {opportunity.opportunity_data.placeOfPerformance.city},{" "}
                        {opportunity.opportunity_data.placeOfPerformance.state}
                      </div>
                    ) : null}
                    {opportunity.response_deadline ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Due: {new Date(opportunity.response_deadline).toLocaleDateString()}
                      </div>
                    ) : null}
                    {opportunity.opportunity_data?.naicsCode ? (
                      <Badge variant="outline">NAICS: {opportunity.opportunity_data.naicsCode}</Badge>
                    ) : null}
                    {opportunity.opportunity_data?.typeOfSetAsideDescription ? (
                      <Badge variant="outline">{opportunity.opportunity_data.typeOfSetAsideDescription}</Badge>
                    ) : null}
                  </div>

                  {opportunity.opportunity_data?.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {opportunity.opportunity_data.description}
                    </p>
                  ) : null}

                  {opportunity.ai_analysis ? (
                    <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 p-3">
                      <p className="text-sm font-semibold">AI Analysis</p>
                      <p className="mt-1 text-sm text-muted-foreground">{opportunity.ai_analysis.reasoning}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-border/60 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">Your Notes</span>
                      {editingNotes !== opportunity.id ? (
                        <Button variant="ghost" size="sm" onClick={() => startEditingNotes(opportunity)}>
                          <Edit className="mr-1 h-3 w-3" />
                          {opportunity.user_notes ? "Edit" : "Add notes"}
                        </Button>
                      ) : null}
                    </div>

                    {editingNotes === opportunity.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(event) => setNotesValue(event.target.value)}
                          placeholder="Add your notes about this opportunity..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(opportunity.id)} disabled={updateNotesMutation.isPending}>
                            <Check className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditingNotes}>
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : opportunity.user_notes ? (
                      <p className="text-sm text-muted-foreground">{opportunity.user_notes}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">No notes yet</p>
                    )}
                  </div>

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
                  <Button variant="outline" size="icon" onClick={() => handleDelete(opportunity)} title="Remove from saved">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark className="h-12 w-12" />}
          title="No saved opportunities"
          description="When you save opportunities from Search, they will appear here for quick review."
          action={
            <Button asChild>
              <Link to="/search">Start searching</Link>
            </Button>
          }
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove saved opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this opportunity from your saved list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={unsaveOpportunityMutation.isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
