import { memo } from "react"
import { Check, Cpu, Search, Sparkles } from "lucide-react"

type SearchStage = "pending" | "searching" | "scoring" | "complete" | "failed"

interface SearchProgressBarProps {
  status: string
  error?: string | null
}

const STAGES: { key: SearchStage; label: string; icon: typeof Search }[] = [
  { key: "searching", label: "Querying SAM.gov", icon: Search },
  { key: "scoring", label: "AI Scoring", icon: Cpu },
  { key: "complete", label: "Complete", icon: Sparkles },
]

function getActiveIndex(status: string): number {
  switch (status) {
    case "pending":
    case "processing":
    case "searching":
      return 0
    case "scoring":
      return 1
    case "complete":
      return 2
    default:
      return -1
  }
}

function SearchProgressBarInner({ status, error }: SearchProgressBarProps) {
  const activeIndex = getActiveIndex(status)
  const isFailed = status === "failed"

  return (
    <div className="space-y-4">
      {/* Stage indicators */}
      <div className="relative flex items-center justify-between">
        {/* Connecting track */}
        <div className="absolute inset-x-0 top-5 z-0 mx-12 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-12 z-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{
            width:
              activeIndex >= 2
                ? "calc(100% - 6rem)"
                : activeIndex >= 1
                ? "calc(50% - 3rem)"
                : "0%",
          }}
        />

        {STAGES.map((stage, index) => {
          const isComplete = activeIndex > index
          const isActive = activeIndex === index && !isFailed
          const Icon = stage.icon

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                ].join(" ")}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Icon className="h-4 w-4 animate-pulse" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={[
                  "text-xs font-medium transition-colors",
                  isComplete || isActive ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Active shimmer bar */}
      {activeIndex >= 0 && activeIndex < 2 && !isFailed ? (
        <div className="progress-track h-1.5 w-full rounded-full bg-muted" />
      ) : null}

      {/* Status text */}
      <p className="text-center text-sm text-muted-foreground">
        {isFailed
          ? error || "Search failed. Please try again."
          : status === "searching"
          ? "Fetching opportunities from SAM.gov..."
          : status === "scoring"
          ? "Analyzing opportunities with AI. This may take a moment for larger result sets."
          : status === "complete"
          ? "All done! Review your top matches below."
          : "Initializing search..."}
      </p>
    </div>
  )
}

export const SearchProgressBar = memo(SearchProgressBarInner)
