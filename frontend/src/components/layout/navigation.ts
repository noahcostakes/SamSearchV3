import type { LucideIcon } from "lucide-react"
import {
  Bookmark,
  LayoutDashboard,
  Search,
  Settings,
  User,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Snapshot of activity and setup progress",
    icon: LayoutDashboard,
  },
  {
    href: "/search",
    label: "Search",
    shortLabel: "Search",
    description: "Find and score matching opportunities",
    icon: Search,
  },
  {
    href: "/saved",
    label: "Saved",
    shortLabel: "Saved",
    description: "Track saved opportunities and notes",
    icon: Bookmark,
  },
  {
    href: "/profile",
    label: "Profile",
    shortLabel: "Profile",
    description: "Manage company profile and fit signals",
    icon: User,
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "Configure keys and account preferences",
    icon: Settings,
  },
]

export function getActiveNavItem(pathname: string): NavItem {
  const matched =
    PRIMARY_NAV_ITEMS.find((item) => pathname === item.href) ??
    PRIMARY_NAV_ITEMS.find((item) => pathname.startsWith(`${item.href}/`))

  return matched ?? PRIMARY_NAV_ITEMS[0]
}
