// Builds a safe, friendly filename from the project name. Stripping to
// `[a-z0-9-]` keeps it free of characters that could break attachment headers.
function buildSpecFilename(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${slug.length > 0 ? slug : "spec"}.md`
}

export { buildSpecFilename }
