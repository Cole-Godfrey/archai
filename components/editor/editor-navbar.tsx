"use client"

import { UserButton } from "@clerk/nextjs"
import { PanelLeftClose as PanelLeftClosed, PanelLeftOpen } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  centerSlot?: ReactNode
  actionSlot?: ReactNode
  className?: string
}

function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  centerSlot,
  actionSlot,
  className,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClosed : PanelLeftOpen
  const sidebarLabel = isSidebarOpen
    ? "Close project sidebar"
    : "Open project sidebar"

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3",
        className
      )}
    >
      <div className="flex flex-1 items-center justify-start">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={sidebarLabel}
          aria-pressed={isSidebarOpen}
          title={sidebarLabel}
          onClick={onToggleSidebar}
        >
          <SidebarIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {centerSlot}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {actionSlot}
        <UserButton />
      </div>
    </header>
  )
}

export { EditorNavbar }
