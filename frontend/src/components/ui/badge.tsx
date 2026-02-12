/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/12 text-primary hover:bg-primary/20",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/85",
        destructive:
          "border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive/20",
        outline: "border-border bg-background text-foreground",
        success:
          "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
        warning:
          "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
