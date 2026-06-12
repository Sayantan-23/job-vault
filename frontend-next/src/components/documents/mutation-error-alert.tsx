// Destructive inline alert for a failed generate/save/delete mutation —
// shared by the cover-letters and résumés workspaces. Renders nothing
// while the mutation has no error.
export function MutationErrorAlert({ error }: { error: Error | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error.message}
    </p>
  )
}
