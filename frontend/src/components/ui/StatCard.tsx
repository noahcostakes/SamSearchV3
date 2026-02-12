import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { Card, CardContent } from "./card"

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  hint?: string
  className?: string
}

export function StatCard({ label, value, icon, hint, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/70 bg-card/90", className)}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
