import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Eye, EyeOff, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRegister } from "@/hooks/useAuth"

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    company_name: z.string().min(2, "Company name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const registerMutation = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      confirm_password: data.confirmPassword,
    })
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
              <h1 className="font-display text-4xl leading-tight">Set up your workspace for smarter opportunity matching.</h1>
              <p className="mt-4 text-sm text-white/85">
                Create your account, add your SAM.gov key, and start reviewing ranked opportunities in minutes.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Guided setup and profile onboarding
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Quick-search top matches
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Saved pipeline with notes
              </li>
            </ul>
          </div>
        </section>

        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="pb-3">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary md:hidden">
              <Search className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl">Create account</CardTitle>
            <CardDescription>Get started with AI-assisted SAM.gov opportunity scoring.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Your Company, LLC"
                  {...register("company_name")}
                  aria-invalid={errors.company_name ? "true" : "false"}
                />
                {errors.company_name ? <p className="text-sm text-destructive">{errors.company_name.message}</p> : null}
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
                Password policy: at least 12 characters with uppercase, lowercase, number, and special character.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
