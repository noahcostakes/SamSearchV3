import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  searchApi,
  type SaveOpportunityRequest,
  type SearchRequest,
} from "@/services/api"
import { toast } from "@/components/ui/use-toast"

export function useStartSearch() {
  return useMutation({
    mutationFn: (data: SearchRequest) => searchApi.search(data),
    onSuccess: () => {
      toast({
        title: "Search started",
        description: "We're searching SAM.gov for opportunities. This may take a moment.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error.message || "Could not start search",
      })
    },
  })
}

export function useSearchHistory(limit: number = 10, offset: number = 0) {
  return useQuery({
    queryKey: ["searchHistory", limit, offset],
    queryFn: () => searchApi.getHistory(limit, offset),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useSearchHistoryDetails(searchId: string | null) {
  return useQuery({
    queryKey: ["searchHistoryDetails", searchId],
    queryFn: () =>
      searchId ? searchApi.getHistoryById(searchId) : Promise.resolve(null),
    enabled: !!searchId,
    staleTime: 10 * 1000,
  })
}

export function useSearchResults(jobId: string | null) {
  return useQuery({
    queryKey: ["searchResults", jobId],
    queryFn: () => (jobId ? searchApi.getStatus(jobId) : Promise.resolve(null)),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Stop polling when job is complete
      const data = query.state.data
      if (data && (data.status === "complete" || data.status === "failed")) {
        return false
      }
      return 2000 // Poll every 2 seconds
    },
  })
}

export function useSavedOpportunities(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ["savedOpportunities", limit, offset],
    queryFn: () => searchApi.getSavedOpportunities(undefined, limit, offset),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useSaveOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SaveOpportunityRequest) => searchApi.saveOpportunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedOpportunities"] })
      toast({
        title: "Opportunity saved",
        description: "The opportunity has been added to your saved list.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Could not save opportunity",
      })
    },
  })
}

export function useUnsaveOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (opportunityId: string) => searchApi.unsaveOpportunity(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedOpportunities"] })
      toast({
        title: "Opportunity removed",
        description: "The opportunity has been removed from your saved list.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: error.message || "Could not remove opportunity",
      })
    },
  })
}

export function useUpdateOpportunityNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ opportunityId, notes }: { opportunityId: string; notes: string }) =>
      searchApi.updateOpportunityStatus(opportunityId, 'saved', notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedOpportunities"] })
      toast({
        title: "Notes updated",
        description: "Your notes have been saved.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update notes",
      })
    },
  })
}

export function useExportCSV() {
  return useMutation({
    mutationFn: () => searchApi.exportCSV(),
    onSuccess: () => {
      toast({
        title: "Export complete",
        description: "Your saved opportunities have been downloaded as CSV.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message || "Could not export opportunities",
      })
    },
  })
}
