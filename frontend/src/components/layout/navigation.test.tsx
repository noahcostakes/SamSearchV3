import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

import { getActiveNavItem } from "./navigation"
import { Sidebar } from "./Sidebar"

describe("navigation configuration", () => {
  it("matches nested routes to parent navigation item", () => {
    const active = getActiveNavItem("/search/results/123")
    expect(active.href).toBe("/search")
  })

  it("marks the active nav link with aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Sidebar open={false} onClose={vi.fn()} />
      </MemoryRouter>
    )

    const activeLink = screen.getByRole("link", { name: "Search" })
    expect(activeLink).toHaveAttribute("aria-current", "page")

    const inactiveLink = screen.getByRole("link", { name: "Dashboard" })
    expect(inactiveLink).not.toHaveAttribute("aria-current", "page")
  })
})
