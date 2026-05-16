"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface EmptyProjectStateProps {
  title: string
  description: string
}

function EmptyProjectState({ title, description }: EmptyProjectStateProps) {
  return (
    <div className="flex min-h-48 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border-subtle bg-elevated/40 px-6 text-center">
      <p className="text-sm font-medium text-copy-secondary">{title}</p>
      <p className="mt-2 text-xs leading-5 text-copy-muted">{description}</p>
    </div>
  )
}

function ProjectSidebar({ isOpen, onClose, className }: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      aria-label="Project sidebar"
      inert={!isOpen}
      className={cn(
        "fixed bottom-4 left-4 top-[4.5rem] z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-glass shadow-xl backdrop-blur-md transition-[opacity,transform] duration-200 ease-out",
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-[calc(100%+2rem)] opacity-0",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close project sidebar"
          title="Close project sidebar"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 p-4">
        <TabsList className="grid w-full grid-cols-2 bg-subtle">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="mt-4 flex min-h-0">
          <EmptyProjectState
            title="No projects yet"
            description="Projects you create will appear here."
          />
        </TabsContent>
        <TabsContent value="shared" className="mt-4 flex min-h-0">
          <EmptyProjectState
            title="No shared projects"
            description="Projects shared with you will appear here."
          />
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-4">
        <Button type="button" className="w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </aside>
  )
}

export { ProjectSidebar }
