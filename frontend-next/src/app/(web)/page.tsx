import type { Metadata } from 'next'
import { Hero } from '@/components/web/landing/hero'
import { StepsStrip } from '@/components/web/landing/steps-strip'
import { CaptureSection } from '@/components/web/landing/capture-section'
import { ForkSection } from '@/components/web/landing/fork-section'
import { DocumentsSection } from '@/components/web/landing/documents-section'
import { PipelineSection } from '@/components/web/landing/pipeline-section'
import { Interstitial } from '@/components/web/landing/interstitial'
import { FaqSection } from '@/components/web/landing/faq-section'

export const metadata: Metadata = {
  // Absolute, so the root layout's "%s | JobVault" template doesn't double it.
  title: { absolute: 'JobVault' },
  description:
    'Save job postings in one click, write tailored resumes and cover letters, and track every application in one place so none of them go quiet on you.',
}

// Server component. Sections render in real product order (Capture → Personas →
// Documents → Track dark band → kinetic interstitial → FAQ); the nav, backdrop,
// and the dark finale (closing CTA + footer) come from WebShell (the (web)
// layout). `.landing` is a plain positioned column the sections live in.
export default function LandingPage() {
  return (
    <div className="landing">
      <Hero />
      <StepsStrip />
      <CaptureSection />
      <ForkSection />
      <DocumentsSection />
      <PipelineSection />
      <Interstitial />
      <FaqSection />
    </div>
  )
}
