'use client'

import type { ResumeContent } from '@/types/resume'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  value: ResumeContent
  onChange: (next: ResumeContent) => void
}

export function ResumeContentEditor({ value, onChange }: Props) {
  const patch = (partial: Partial<ResumeContent>) => onChange({ ...value, ...partial })

  const setExperience = (i: number, partial: Partial<ResumeContent['experience'][number]>) => {
    const experience = value.experience.map((e, idx) => (idx === i ? { ...e, ...partial } : e))
    patch({ experience })
  }
  const bulletsAt = (i: number): string[] => value.experience[i]?.bullets ?? []
  const addBullet = (i: number) => setExperience(i, { bullets: [...bulletsAt(i), ''] })
  const setBullet = (i: number, b: number, text: string) =>
    setExperience(i, { bullets: bulletsAt(i).map((x, idx) => (idx === b ? text : x)) })
  const removeBullet = (i: number, b: number) =>
    setExperience(i, { bullets: bulletsAt(i).filter((_, idx) => idx !== b) })
  const removeExperience = (i: number) => patch({ experience: value.experience.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label htmlFor="rc-name">Name</Label>
        <Input
          id="rc-name"
          value={value.basics.name}
          onChange={(e) => patch({ basics: { ...value.basics, name: e.target.value } })}
        />
        <Label htmlFor="rc-summary">Summary</Label>
        <Textarea
          id="rc-summary"
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Experience</h3>
        {value.experience.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Experience ${i + 1} company`}
                value={exp.company}
                onChange={(e) => setExperience(i, { company: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove experience ${i + 1}`}
                onClick={() => removeExperience(i)}
              >
                Remove
              </Button>
            </div>
            <Input
              aria-label={`Experience ${i + 1} title`}
              value={exp.title}
              onChange={(e) => setExperience(i, { title: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} date`}
              value={exp.date}
              onChange={(e) => setExperience(i, { date: e.target.value })}
            />
            <ul className="space-y-1">
              {exp.bullets.map((b, bi) => (
                <li key={bi} className="flex items-center gap-2">
                  <Input
                    aria-label={`Experience ${i + 1} bullet ${bi + 1}`}
                    value={b}
                    onChange={(e) => setBullet(i, bi, e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove bullet ${bi + 1}`} onClick={() => removeBullet(i, bi)}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={() => addBullet(i)}>
              Add bullet
            </Button>
          </div>
        ))}
      </section>
    </div>
  )
}
