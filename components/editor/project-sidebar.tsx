"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { EditorProject } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  activeProjectId?: string
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
  onClose: () => void
  onCreateProject: () => void
  onRenameProject: (project: EditorProject) => void
  onDeleteProject: (project: EditorProject) => void
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

interface ProjectListProps {
  activeProjectId?: string
  projects: EditorProject[]
  emptyTitle: string
  emptyDescription: string
  onRenameProject: (project: EditorProject) => void
  onDeleteProject: (project: EditorProject) => void
}

interface ProjectListItemProps {
  activeProjectId?: string
  project: EditorProject
  onRenameProject: (project: EditorProject) => void
  onDeleteProject: (project: EditorProject) => void
}

function ProjectListItem({
  activeProjectId,
  project,
  onRenameProject,
  onDeleteProject,
}: ProjectListItemProps) {
  const canManageProject = project.role === "owner"
  const isActive = activeProjectId === project.id
  const projectMeta =
    project.role === "owner"
      ? project.updatedAtLabel
      : project.ownerName
        ? `${project.updatedAtLabel} by ${project.ownerName}`
        : project.updatedAtLabel

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-elevated/60 p-3 transition-colors",
        isActive
          ? "border-brand bg-accent-dim"
          : "border-surface-border hover:border-surface-border-subtle"
      )}
    >
      <Link
        href={`/editor/${project.id}`}
        className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-current={isActive ? "page" : undefined}
      >
        <p className="truncate text-sm font-medium text-copy-primary">
          {project.name}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-copy-muted">
          /{project.roomId}
        </p>
        <p className="mt-2 truncate text-xs text-copy-faint">{projectMeta}</p>
      </Link>

      {canManageProject ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-copy-muted hover:text-copy-primary"
            aria-label={`Rename ${project.name}`}
            title={`Rename ${project.name}`}
            onClick={() => onRenameProject(project)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-state-error hover:text-state-error"
            aria-label={`Delete ${project.name}`}
            title={`Delete ${project.name}`}
            onClick={() => onDeleteProject(project)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function ProjectList({
  activeProjectId,
  projects,
  emptyTitle,
  emptyDescription,
  onRenameProject,
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) {
    return <EmptyProjectState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {projects.map((project) => (
        <ProjectListItem
          key={project.id}
          activeProjectId={activeProjectId}
          project={project}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
        />
      ))}
    </ul>
  )
}

function ProjectSidebar({
  isOpen,
  activeProjectId,
  ownedProjects,
  sharedProjects,
  onClose,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  className,
}: ProjectSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden={!isOpen}
        aria-label="Close project sidebar"
        tabIndex={isOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-30 bg-base/70 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
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
            <ProjectList
              activeProjectId={activeProjectId}
              projects={ownedProjects}
              emptyTitle="No projects yet"
              emptyDescription="Projects you create will appear here."
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-4 flex min-h-0">
            <ProjectList
              activeProjectId={activeProjectId}
              projects={sharedProjects}
              emptyTitle="No shared projects"
              emptyDescription="Projects shared with you will appear here."
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
        </Tabs>

        <div className="border-t border-surface-border p-4">
          <Button type="button" className="w-full" onClick={onCreateProject}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

export { ProjectSidebar }
