import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Eye, EyeOff, Search, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useLogin } from "@/hooks/useAuth"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="page-enter relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-float md:grid-cols-2">
        <section className="hidden bg-[linear-gradient(165deg,#0B2F66_0%,#123D82_40%,#1F4B94_100%)] p-10 text-white md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Search className="h-6 w-6" />
              </div>
              <h1 className="font-display text-4xl leading-tight">Find the right federal opportunities faster.</h1>
              <p className="mt-4 text-sm text-white/85">
                SamSearch combines profile-aware filtering and AI scoring so your team can focus on the highest-fit bids.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-ranked top opportunities
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Encrypted SAM.gov key storage
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Save, annotate, and track pipeline
              </li>
            </ul>
          </div>
        </section>

        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="pb-4">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary md:hidden">
              <Search className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl">Welcome back</CardTitle>
            <CardDescription>Sign in to continue your contract search workflow.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-semibold text-primary">
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
