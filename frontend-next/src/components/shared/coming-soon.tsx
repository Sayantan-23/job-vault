export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        This page is coming soon. The public site is being redesigned.
      </p>
    </section>
  )
}
