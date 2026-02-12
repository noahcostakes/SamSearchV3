import { useState } from "react"
import { Outlet } from "react-router-dom"

import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="page-enter min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col md:pl-72">
          <Header onMenuClick={() => setSidebarOpen(true)} isNavOpen={sidebarOpen} />
          <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-10 pt-6 md:px-8 md:pt-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
