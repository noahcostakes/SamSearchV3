import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"

import { LoginPage } from "./LoginPage"
import { RegisterPage } from "./RegisterPage"

const loginMutate = vi.fn()
const registerMutate = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useLogin: () => ({
    mutate: loginMutate,
    isPending: false,
  }),
  useRegister: () => ({
    mutate: registerMutate,
    isPending: false,
  }),
}))

describe("auth page layout and validation", () => {
  beforeEach(() => {
    loginMutate.mockReset()
    registerMutate.mockReset()
  })

  it("exposes labelled login controls and validation errors", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument()
    expect(await screen.findByText("Password is required")).toBeInTheDocument()
    expect(loginMutate).not.toHaveBeenCalled()
  })

  it("validates register confirm password mapping", async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme" } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "securepassword" } })
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "differentpassword" } })
    fireEvent.click(screen.getByRole("button", { name: "Create account" }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(registerMutate).not.toHaveBeenCalled()
  })
})
