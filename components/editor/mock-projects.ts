interface MockProject {
  id: string
  name: string
  slug: string
  role: "owner" | "collaborator"
  updatedAt: string
  ownerName?: string
}

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "project-obelisk-payments",
    name: "Obelisk Payments Platform",
    slug: "obelisk-payments-platform",
    role: "owner",
    updatedAt: "Updated 2h ago",
  },
  {
    id: "project-orbital-mesh",
    name: "Orbital Event Mesh",
    slug: "orbital-event-mesh",
    role: "owner",
    updatedAt: "Updated yesterday",
  },
  {
    id: "project-harbor-analytics",
    name: "Harbor Analytics",
    slug: "harbor-analytics",
    role: "collaborator",
    updatedAt: "Shared last week",
    ownerName: "Mira Chen",
  },
]

export { MOCK_PROJECTS }
export type { MockProject }
