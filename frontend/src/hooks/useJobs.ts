import { useQuery } from "@tanstack/react-query"
import { jobsApi } from "@/services/api"

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["jobStatus", jobId],
    queryFn: () => (jobId ? jobsApi.getStatus(jobId) : Promise.resolve(null)),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && (data.status === "complete" || data.status === "failed")) {
        return false
      }
      return 2000 // Poll every 2 seconds while in progress
    },
  })
}

export function useJobResult(jobId: string | null) {
  return useQuery({
    queryKey: ["jobResult", jobId],
    queryFn: () => (jobId ? jobsApi.getStatus(jobId) : Promise.resolve(null)),
    enabled: !!jobId,
  })
}
