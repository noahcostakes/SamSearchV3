import { useLocation, useNavigate } from "react-router-dom"
import { LogOut, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

import { getActiveNavItem } from "./navigation"

interface HeaderProps {
  onMenuClick?: () => void
  isNavOpen?: boolean
}

export function Header({ onMenuClick, isNavOpen = false }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const activeItem = getActiveNavItem(location.pathname)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-controls="primary-navigation"
            aria-expanded={isNavOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              SamSearch Workspace
            </p>
            <p className="font-display text-lg leading-none text-foreground">
              {activeItem.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden rounded-lg border border-border/70 bg-card/80 px-3 py-1.5 text-right shadow-sm sm:block">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Signed in as
            </p>
            <p className="max-w-[180px] truncate text-sm font-semibold">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
