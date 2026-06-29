// Builds a safe, friendly filename from the project name and persisted spec id.
// Stripping to `[a-z0-9-]` keeps it free of attachment-header separators.
function buildSpecFilename(projectName: string, specId: string): string {
  const projectSlug = toFilenameSlug(projectName)
  const specSlug = toFilenameSlug(specId)

  return `${projectSlug.length > 0 ? projectSlug : "spec"}-${
    specSlug.length > 0 ? specSlug : "revision"
  }.md`
}

function toFilenameSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export { buildSpecFilename }
