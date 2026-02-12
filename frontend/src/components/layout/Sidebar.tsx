import { useEffect, useRef } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { PRIMARY_NAV_ITEMS } from "./navigation"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const previousPathRef = useRef(location.pathname)

  useEffect(() => {
    if (open && previousPathRef.current !== location.pathname) {
      onClose()
    }
    previousPathRef.current = location.pathname
  }, [location.pathname, onClose, open])

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        id="primary-navigation"
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-700/60 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-float transition-transform duration-200 md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-700/60 px-5">
          <Link to="/dashboard" className="flex items-center gap-3 no-underline" onClick={onClose}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/25 text-primary-foreground ring-1 ring-primary/40">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg leading-none">SamSearch</p>
              <p className="text-xs tracking-[0.16em] text-[hsl(var(--sidebar-muted))] uppercase">
                Contract Intel
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={item.description}
                className={({ isActive }) =>
                  cn(
                    "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar))]",
                    isActive
                      ? "bg-primary/20 text-white ring-1 ring-primary/55"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-white/10"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-block h-6 w-1 rounded-full bg-transparent transition-colors",
                        isActive && "bg-primary"
                      )}
                    />
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-700/60 px-4 py-4 text-xs text-[hsl(var(--sidebar-muted))]">
          <p className="font-semibold uppercase tracking-[0.12em]">SamSearch</p>
          <p className="mt-1">Focused opportunity discovery for federal teams.</p>
        </div>
      </aside>
    </>
  )
}
