import { useState } from "react"
import { Link } from "react-router-dom"
import { Bookmark, Check, Download, Edit, X } from "lucide-react"

import { PageHeader } from "@/components/layout"
import { SavedOpportunityCard } from "@/components/OpportunityCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/EmptyState"
import { SectionCard } from "@/components/ui/SectionCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useExportCSV,
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
  const exportCSVMutation = useExportCSV()

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

  const renderNotesSlot = (opportunity: SavedOpportunity) => (
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
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Saved Opportunities"
        description="Track shortlisted opportunities and capture your internal notes."
        actions={
          savedOpportunities?.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSVMutation.mutate()}
              disabled={exportCSVMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportCSVMutation.isPending ? "Exporting..." : "Export CSV"}
            </Button>
          ) : null
        }
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
        <div className="content-reveal space-y-3">
          {savedOpportunities.map((opportunity) => (
            <SavedOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onDelete={() => handleDelete(opportunity)}
              notesSlot={renderNotesSlot(opportunity)}
            />
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
