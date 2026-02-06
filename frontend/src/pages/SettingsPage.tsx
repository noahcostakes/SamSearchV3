import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Key, Shield, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
  useSAMKeyStatus,
  useUpdateSAMKey,
  useDeleteSAMKey,
} from "@/hooks/useProfile"

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and API configurations
        </p>
      </div>

      {/* SAM.gov API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            SAM.gov API Key
          </CardTitle>
          <CardDescription>
            Your SAM.gov API key is required to search for contract opportunities.
            Get your API key from{" "}
            <a
              href="https://sam.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              SAM.gov
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : samKeyStatus?.has_key ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">API Key Configured</p>
                    <p className="text-sm text-muted-foreground">
                      {samKeyStatus.expires_at
                        ? `Expires: ${new Date(samKeyStatus.expires_at).toLocaleDateString()}`
                        : "No expiration set"}
                    </p>
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "Cancel Update" : "Update Key"}
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Key
                </Button>
              </div>
            </div>
          ) : null}

          {(!samKeyStatus?.has_key || showKey) && !statusLoading && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">
                  {samKeyStatus?.has_key ? "New API Key" : "API Key"}
                </Label>
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
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.api_key && (
                  <p className="text-sm text-destructive">
                    {errors.api_key.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateSAMKeyMutation.isPending}
                >
                  {updateSAMKeyMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save API Key"
                  )}
                </Button>
                {samKeyStatus?.has_key && (
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
                )}
              </div>
            </form>
          )}

          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              How to get your SAM.gov API Key
            </h4>
            <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="underline">SAM.gov</a> and sign in or create an account</li>
              <li>Navigate to your profile and find the API section</li>
              <li>Request a new API key for Opportunities API</li>
              <li>Copy the API key and paste it above</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-1">Password</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Change your account password
            </p>
            <Button variant="outline" disabled>
              Change Password (Coming Soon)
            </Button>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Add an extra layer of security to your account
            </p>
            <Button variant="outline" disabled>
              Enable 2FA (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>
            Manage your data and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-1">Export Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download a copy of your data including saved opportunities and search history
            </p>
            <Button variant="outline" disabled>
              Export Data (Coming Soon)
            </Button>
          </div>
          <div className="p-4 border rounded-lg border-destructive/50">
            <h4 className="font-medium mb-1 text-destructive">Delete Account</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data
            </p>
            <Button variant="destructive" disabled>
              Delete Account (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Key Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SAM.gov API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your SAM.gov API key? You will not be able
              to search for opportunities until you add a new key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              disabled={deleteSAMKeyMutation.isPending}
            >
              {deleteSAMKeyMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
