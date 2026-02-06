import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { profileApi, type CompanyProfileUpdate, type SAMKeyUpdate } from "@/services/api"
import { toast } from "@/components/ui/use-toast"
import type { CompanyProfile } from "@/types"

export function useProfile() {
  return useQuery<CompanyProfile | null>({
    queryKey: ["profile"],
    queryFn: profileApi.get,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompanyProfileUpdate) => profileApi.update(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["profile"], updatedProfile)
      toast({
        title: "Profile updated",
        description: "Your company profile has been saved.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update profile",
      })
    },
  })
}

export function useSAMKeyStatus() {
  return useQuery({
    queryKey: ["samKeyStatus"],
    queryFn: profileApi.getSAMKeyStatus,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useUpdateSAMKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SAMKeyUpdate) => profileApi.updateSAMKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["samKeyStatus"] })
      toast({
        title: "SAM.gov API key updated",
        description: "Your API key has been securely stored.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Could not update API key",
      })
    },
  })
}

export function useDeleteSAMKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: profileApi.deleteSAMKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["samKeyStatus"] })
      toast({
        title: "SAM.gov API key removed",
        description: "Your API key has been deleted.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || "Could not delete API key",
      })
    },
  })
}
