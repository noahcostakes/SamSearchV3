import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { Layout } from "./Layout"

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe("layout accessibility", () => {
  it("renders skip link and main landmark target", () => {
    renderLayout()

    const skipLink = screen.getByRole("link", { name: "Skip to main content" })
    expect(skipLink).toHaveAttribute("href", "#main-content")

    const main = document.getElementById("main-content")
    expect(main).toBeInTheDocument()
    expect(main).toHaveAttribute("tabindex", "-1")
  })

  it("opens and closes mobile navigation drawer", () => {
    renderLayout()

    const openButton = screen.getByRole("button", { name: "Open navigation menu" })
    fireEvent.click(openButton)
    expect(screen.getByLabelText("Close navigation overlay")).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Close navigation overlay"))
    expect(screen.queryByLabelText("Close navigation overlay")).not.toBeInTheDocument()
  })
})
