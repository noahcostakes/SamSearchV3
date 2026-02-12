import { describe, expect, it, vi, afterEach } from "vitest"

import { api, authApi, jobsApi, searchApi } from "@/services/api"

describe("api service contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses backend limit/offset for history", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: [],
    } as never)

    await searchApi.getHistory(10, 20)

    expect(getSpy).toHaveBeenCalledWith("/search/history", {
      params: { limit: 10, offset: 20 },
    })
  })

  it("updates saved opportunity using PUT query params", async () => {
    const putSpy = vi.spyOn(api, "put").mockResolvedValue({
      data: { id: "saved-1" },
    } as never)

    await searchApi.updateOpportunityStatus("saved-1", "pursuing", "note")

    expect(putSpy).toHaveBeenCalledWith("/search/saved/saved-1", null, {
      params: { user_status: "pursuing", user_notes: "note" },
    })
  })

  it("cancels jobs with DELETE /jobs/{id}", async () => {
    const deleteSpy = vi.spyOn(api, "delete").mockResolvedValue({
      data: { message: "ok" },
    } as never)

    await jobsApi.cancel("job-123")

    expect(deleteSpy).toHaveBeenCalledWith("/jobs/job-123")
  })

  it("login returns token payload directly", async () => {
    const payload = {
      access_token: "access",
      refresh_token: "refresh",
      token_type: "bearer",
    }
    vi.spyOn(api, "post").mockResolvedValue({ data: payload } as never)

    const response = await authApi.login({
      email: "user@example.com",
      password: "password",
    })

    expect(response).toEqual(payload)
  })
})
