import { useState } from "react"
import {
  Bookmark,
  ExternalLink,
  Trash2,
  Clock,
  Building,
  MapPin,
  Edit,
  X,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useSavedOpportunities,
  useUnsaveOpportunity,
  useUpdateOpportunityNotes,
} from "@/hooks/useSearch"
import type { SavedOpportunity } from "@/types"

export function SavedPage() {
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<SavedOpportunity | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")

  const { data: savedOpportunities, isLoading } = useSavedOpportunities(page, 10)
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Opportunities</h1>
        <p className="text-muted-foreground mt-1">
          Manage opportunities you've saved for review
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : savedOpportunities?.items?.length ? (
        <div className="space-y-4">
          {savedOpportunities.items.map((opportunity) => (
            <Card key={opportunity.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {opportunity.title}
                      </h3>
                      {opportunity.relevance_score && (
                        <Badge variant={getScoreColor(opportunity.relevance_score)}>
                          {opportunity.relevance_score}% Match
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {opportunity.agency || "Unknown Agency"}
                      </div>
                      {opportunity.opportunity_data?.placeOfPerformance && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {opportunity.opportunity_data.placeOfPerformance.city}, {opportunity.opportunity_data.placeOfPerformance.state}
                        </div>
                      )}
                      {opportunity.response_deadline && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Due: {new Date(opportunity.response_deadline).toLocaleDateString()}
                        </div>
                      )}
                      {opportunity.opportunity_data?.naicsCode && (
                        <Badge variant="outline">NAICS: {opportunity.opportunity_data.naicsCode}</Badge>
                      )}
                      {opportunity.opportunity_data?.typeOfSetAsideDescription && (
                        <Badge variant="outline">{opportunity.opportunity_data.typeOfSetAsideDescription}</Badge>
                      )}
                    </div>

                    {opportunity.opportunity_data?.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {opportunity.opportunity_data.description}
                      </p>
                    )}

                    {opportunity.ai_analysis && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">AI Analysis:</p>
                        <p className="text-sm text-muted-foreground">
                          {opportunity.ai_analysis.reasoning}
                        </p>
                      </div>
                    )}

                    {/* Notes Section */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Your Notes</span>
                        {editingNotes !== opportunity.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingNotes(opportunity)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {opportunity.user_notes ? "Edit" : "Add notes"}
                          </Button>
                        )}
                      </div>
                      {editingNotes === opportunity.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="Add your notes about this opportunity..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveNotes(opportunity.id)}
                              disabled={updateNotesMutation.isPending}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingNotes}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : opportunity.user_notes ? (
                        <p className="text-sm text-muted-foreground">
                          {opportunity.user_notes}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No notes yet
                        </p>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Saved on {new Date(opportunity.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {opportunity.notice_id && (
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
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(opportunity)}
                      title="Remove from saved"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {savedOpportunities.total > 10 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {Math.ceil(savedOpportunities.total / 10)}
              </span>
              <Button
                variant="outline"
                disabled={page >= Math.ceil(savedOpportunities.total / 10)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Saved Opportunities</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              When you find opportunities you're interested in, save them here for easy access.
            </p>
            <Button asChild>
              <a href="/search">Start Searching</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Saved Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this opportunity from your saved list?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={unsaveOpportunityMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
