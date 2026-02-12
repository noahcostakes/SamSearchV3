import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Key, Shield, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectionCard } from "@/components/ui/SectionCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteSAMKey, useSAMKeyStatus, useUpdateSAMKey } from "@/hooks/useProfile"

const samKeySchema = z.object({
  api_key: z.string().min(20, "API key must be at least 20 characters"),
})

type SAMKeyFormData = z.infer<typeof samKeySchema>

export function SettingsPage() {
  const [showKey, setShowKey] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: samKeyStatus, isLoading: statusLoading } = useSAMKeyStatus()
  const updateSAMKeyMutation = useUpdateSAMKey()
  const deleteSAMKeyMutation = useDeleteSAMKey()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SAMKeyFormData>({
    resolver: zodResolver(samKeySchema),
  })

  const onSubmit = async (data: SAMKeyFormData) => {
    await updateSAMKeyMutation.mutateAsync(data)
    reset()
    setShowKey(false)
  }

  const handleDeleteKey = async () => {
    await deleteSAMKeyMutation.mutateAsync()
    setDeleteDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage API credentials and account-level preferences." />

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            SAM.gov API Key
          </span>
        }
        description={
          <>
            Your SAM.gov API key is required for search. Retrieve your key from{" "}
            <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
              SAM.gov
            </a>
            .
          </>
        }
      >
        {statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : samKeyStatus?.has_key ? (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">API Key Configured</p>
                  <p className="text-sm text-muted-foreground">
                    {samKeyStatus.expires_at
                      ? `Expires: ${new Date(samKeyStatus.expires_at).toLocaleDateString()}`
                      : "No expiration set"}
                  </p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowKey((prev) => !prev)}>
                {showKey ? "Cancel update" : "Update key"}
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete key
              </Button>
            </div>
          </div>
        ) : null}

        {(!samKeyStatus?.has_key || showKey) && !statusLoading ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="api_key">{samKeyStatus?.has_key ? "New API key" : "API key"}</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your SAM.gov API key"
                  {...register("api_key")}
                  aria-invalid={errors.api_key ? "true" : "false"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowKey((prev) => !prev)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.api_key ? <p className="text-sm text-destructive">{errors.api_key.message}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={updateSAMKeyMutation.isPending}>
                {updateSAMKeyMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save API key"
                )}
              </Button>
              {samKeyStatus?.has_key ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowKey(false)
                    reset()
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-2 font-semibold text-amber-900">How to get your SAM.gov API key</h4>
          <ol className="list-inside list-decimal space-y-1 text-sm text-amber-800">
            <li>Sign in to <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="font-semibold underline">SAM.gov</a>.</li>
            <li>Open your profile and locate the API section.</li>
            <li>Request an Opportunities API key.</li>
            <li>Copy the key and paste it above.</li>
          </ol>
        </div>
      </SectionCard>

      <SectionCard title="Security" description="Additional account controls.">
        <div className="grid gap-3">
          <div className="rounded-lg border border-border/70 p-4">
            <p className="font-semibold">Password</p>
            <p className="mt-1 text-sm text-muted-foreground">Change your account password.</p>
            <Button variant="outline" disabled className="mt-3">
              Change password (coming soon)
            </Button>
          </div>
          <div className="rounded-lg border border-border/70 p-4">
            <p className="font-semibold">Two-factor authentication</p>
            <p className="mt-1 text-sm text-muted-foreground">Add a second verification step to sign-in.</p>
            <Button variant="outline" disabled className="mt-3">
              Enable 2FA (coming soon)
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Data & Privacy" description="Manage data lifecycle controls.">
        <div className="grid gap-3">
          <div className="rounded-lg border border-border/70 p-4">
            <p className="font-semibold">Export data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Download your saved opportunities and search history.
            </p>
            <Button variant="outline" disabled className="mt-3">
              Export data (coming soon)
            </Button>
          </div>
          <div className="rounded-lg border border-destructive/35 p-4">
            <p className="font-semibold text-destructive">Delete account</p>
            <p className="mt-1 text-sm text-muted-foreground">Permanently delete all account data.</p>
            <Button variant="destructive" disabled className="mt-3">
              Delete account (coming soon)
            </Button>
          </div>
        </div>
      </SectionCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SAM.gov API key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your SAM.gov API key? You will not be able to search until a new key is added.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey} disabled={deleteSAMKeyMutation.isPending}>
              {deleteSAMKeyMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
