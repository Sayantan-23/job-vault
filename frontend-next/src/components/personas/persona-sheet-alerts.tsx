// frontend-next/src/components/personas/persona-sheet-alerts.tsx
// Shared alert blocks for the persona create/edit sheets.

export function SheetErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

export function SheetValidationErrors({ errors }: { errors: string[] }) {
  return (
    <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <p className="font-medium">Please fix the following:</p>
      <ul className="mt-1 list-inside list-disc">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  )
}
