import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

export interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {title || description || actions ? (
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? <CardTitle className="text-xl">{title}</CardTitle> : null}
              {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("p-6", contentClassName)}>{children}</CardContent>
    </Card>
  )
}
