import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import {
  authApi,
  getErrorMessage,
  type LoginRequest,
  type RegisterRequest,
} from "@/services/api"
import { toast } from "@/components/ui/use-toast"

export function useLogin() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async (response) => {
      const user = await authApi.me()
      login(user, response.access_token, response.refresh_token)
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      })
      navigate("/dashboard")
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      })
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      // First register the user
      await authApi.register(data)
      // Then login to get tokens
      const tokenResponse = await authApi.login({
        email: data.email,
        password: data.password,
      })
      const user = await authApi.me()
      return { user, ...tokenResponse }
    },
    onSuccess: (response) => {
      login(response.user, response.access_token, response.refresh_token)
      toast({
        title: "Account created!",
        description: "Welcome to SamSearch. Let's set up your profile.",
      })
      navigate("/profile")
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || "Could not create account"
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: message,
      })
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const { logout, accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (accessToken) {
        await authApi.logout()
      }
    },
    onSettled: () => {
      logout()
      queryClient.clear()
      navigate("/login")
    },
  })
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}
