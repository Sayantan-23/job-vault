import type { Metadata } from 'next'
import { Hero } from '@/components/web/landing/hero'
import { CaptureSection } from '@/components/web/landing/capture-section'
import { DocumentsSection } from '@/components/web/landing/documents-section'
import { PipelineSection } from '@/components/web/landing/pipeline-section'
import { CapabilitiesSection } from '@/components/web/landing/capabilities-section'
import { ClosingSection } from '@/components/web/landing/closing-section'

export const metadata: Metadata = {
  // Absolute, so the root layout's "%s — JobVault" template doesn't double it.
  title: { absolute: 'JobVault' },
  description:
    'JobVault wires your whole job search into one system: capture postings in one click, generate tailored resumes and cover letters per role, track every application in one pipeline, and get a nudge before anything goes cold.',
}

// Server component. Sections render in real product order (Persona + Job →
// fork → Résumé + Cover letter → Pipeline → capabilities → closing); the nav,
// backdrop, and footer come from WebShell (the (web) layout).
export default function LandingPage() {
  return (
    <>
      <Hero />
      <CaptureSection />
      <DocumentsSection />
      <PipelineSection />
      <CapabilitiesSection />
      <ClosingSection />
    </>
  )
}
