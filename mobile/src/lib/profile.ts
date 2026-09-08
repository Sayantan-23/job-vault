import type {
  MonthYear,
  ProfileContent,
  ProfileExperience,
  ProfileProject,
  ProfileSkillGroup,
  ProfileEducation,
  ProfileLink,
} from '@/types/profile';

// Prefer crypto.randomUUID when available; fall back to a non-crypto random id
// (e.g. in test environments where crypto.randomUUID may be undefined).
export const newId = (): string => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const emptyProfileContent = (): ProfileContent => ({
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  experience: [],
  projects: [],
  skills: [],
  education: [],
});

export const newLink = (): ProfileLink => ({ id: newId(), label: '', url: '' });
export const newExperience = (): ProfileExperience => ({
  id: newId(),
  company: '',
  role: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
});
export const newProject = (): ProfileProject => ({
  id: newId(),
  name: '',
  technologies: [],
  bullets: [],
  links: [],
  startDate: null,
  endDate: null,
  inProgress: false,
});
export const newSkillGroup = (): ProfileSkillGroup => ({
  id: newId(),
  category: 'Skills',
  items: [],
});
export const newEducation = (): ProfileEducation => ({
  id: newId(),
  degree: '',
  institution: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
});

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatMonthYear = (d: MonthYear | null): string => {
  if (!d) return '';
  const month = d.month ? MONTH_LABELS[d.month - 1] : undefined;
  return month ? `${month} ${d.year}` : String(d.year);
};

// "Jan 2022 – Present", "2019 – 2021", "Mar 2022" (no end), "" (no dates).
export function formatMonthYearRange(
  startDate: MonthYear | null,
  endDate: MonthYear | null,
  current: boolean
): string {
  const start = formatMonthYear(startDate);
  const end = current ? 'Present' : formatMonthYear(endDate);
  return [start, end].filter(Boolean).join(' – ');
}

// Mirrors the backend's min(1) requirements (incl. link label/url) plus form-level
// date requiredness (experience: start + end-unless-current; education: same).
// `requireEducationDates: false` skips the education *date* checks only — for the
// persona sheets, where education is pick-only/read-only and imported/legacy
// entries legitimately carry null dates (degree/institution stay required).
export interface ValidateProfileContentOptions {
  requireEducationDates?: boolean;
}

const validateLinks = (links: ProfileLink[], tag: (i: number) => string, errors: string[]) => {
  links.forEach((l, i) => {
    if (!l.label.trim()) errors.push(`${tag(i)}: label is required`);
    if (!l.url.trim()) errors.push(`${tag(i)}: URL is required`);
  });
};

export function validateProfileContent(
  c: ProfileContent,
  { requireEducationDates = true }: ValidateProfileContentOptions = {}
): string[] {
  const errors: string[] = [];
  if (!c.basics.name.trim()) errors.push('Your name is required');
  validateLinks(c.basics.links, (i) => `Link ${i + 1}`, errors);

  c.experience.forEach((e, i) => {
    const tag = `Experience ${i + 1}`;
    if (!e.company.trim()) errors.push(`${tag}: company is required`);
    if (!e.role.trim()) errors.push(`${tag}: role is required`);
    if (!e.startDate?.year) errors.push(`${tag}: start date is required`);
    if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`);
  });

  c.education.forEach((e, i) => {
    const tag = `Education ${i + 1}`;
    if (!e.degree.trim()) errors.push(`${tag}: degree is required`);
    if (!e.institution.trim()) errors.push(`${tag}: institution is required`);
    if (requireEducationDates) {
      if (!e.startDate?.year) errors.push(`${tag}: start date is required`);
      if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`);
    }
  });

  c.projects.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Project ${i + 1}: name is required`);
    validateLinks(p.links, (j) => `Project ${i + 1}, link ${j + 1}`, errors);
  });

  return errors;
}

// Assign a stable id to every entry/link that lacks one.
export function ensureProfileIds(content: ProfileContent): ProfileContent {
  const withId = <T extends { id?: string }>(x: T): T => (x.id ? x : { ...x, id: newId() });
  return {
    ...content,
    basics: {
      ...content.basics,
      links: (content.basics?.links ?? []).map(withId),
    },
    experience: (content.experience ?? []).map(withId),
    projects: (content.projects ?? []).map((p) => ({
      ...withId(p),
      links: (p.links ?? []).map(withId),
    })),
    skills: (content.skills ?? []).map(withId),
    education: (content.education ?? []).map(withId),
  };
}

/**
 * Reconciles a persona draft with the master profile:
 * If an item in the draft has no id, or its id does not match the master profile,
 * but matches a master profile item by content, sync the profile item's id into the draft.
 * This guarantees that items already in the persona reflect draft membership in the picker.
 */
export function reconcilePersonaWithProfile(
  draft: ProfileContent,
  profile: ProfileContent
): ProfileContent {
  const ensuredProfile = ensureProfileIds(profile);
  const ensuredDraft = ensureProfileIds(draft);

  // 1. Experience: match by id or (company + role)
  const claimedExpIds = new Set(
    ensuredDraft.experience
      .map((e) => e.id)
      .filter((id): id is string => Boolean(id && ensuredProfile.experience.some((p) => p.id === id)))
  );
  const reconciledExp = ensuredDraft.experience.map((exp) => {
    if (exp.id && claimedExpIds.has(exp.id)) {
      return exp;
    }
    const match = ensuredProfile.experience.find(
      (p) =>
        Boolean(p.id && !claimedExpIds.has(p.id)) &&
        p.company.trim().toLowerCase() === exp.company.trim().toLowerCase() &&
        p.role.trim().toLowerCase() === exp.role.trim().toLowerCase()
    );
    if (match?.id) {
      claimedExpIds.add(match.id);
      return { ...exp, id: match.id };
    }
    return exp;
  });

  // 2. Projects: match by id or name
  const claimedProjIds = new Set(
    ensuredDraft.projects
      .map((p) => p.id)
      .filter((id): id is string => Boolean(id && ensuredProfile.projects.some((pr) => pr.id === id)))
  );
  const reconciledProjects = ensuredDraft.projects.map((proj) => {
    if (proj.id && claimedProjIds.has(proj.id)) {
      return proj;
    }
    const match = ensuredProfile.projects.find(
      (p) =>
        Boolean(p.id && !claimedProjIds.has(p.id)) &&
        p.name.trim().toLowerCase() === proj.name.trim().toLowerCase()
    );
    if (match?.id) {
      claimedProjIds.add(match.id);
      return { ...proj, id: match.id };
    }
    return proj;
  });

  // 3. Skills: match by id or category
  const claimedSkillIds = new Set(
    ensuredDraft.skills
      .map((s) => s.id)
      .filter((id): id is string => Boolean(id && ensuredProfile.skills.some((sk) => sk.id === id)))
  );
  const reconciledSkills = ensuredDraft.skills.map((skill) => {
    if (skill.id && claimedSkillIds.has(skill.id)) {
      return skill;
    }
    const match = ensuredProfile.skills.find(
      (p) =>
        Boolean(p.id && !claimedSkillIds.has(p.id)) &&
        p.category.trim().toLowerCase() === skill.category.trim().toLowerCase()
    );
    if (match?.id) {
      claimedSkillIds.add(match.id);
      return { ...skill, id: match.id };
    }
    return skill;
  });

  // 4. Education: match by id or (institution + degree)
  const claimedEduIds = new Set(
    ensuredDraft.education
      .map((e) => e.id)
      .filter((id): id is string => Boolean(id && ensuredProfile.education.some((ed) => ed.id === id)))
  );
  const reconciledEducation = ensuredDraft.education.map((edu) => {
    if (edu.id && claimedEduIds.has(edu.id)) {
      return edu;
    }
    const match = ensuredProfile.education.find(
      (p) =>
        Boolean(p.id && !claimedEduIds.has(p.id)) &&
        p.institution.trim().toLowerCase() === edu.institution.trim().toLowerCase() &&
        p.degree.trim().toLowerCase() === edu.degree.trim().toLowerCase()
    );
    if (match?.id) {
      claimedEduIds.add(match.id);
      return { ...edu, id: match.id };
    }
    return edu;
  });

  return {
    ...ensuredDraft,
    experience: reconciledExp,
    projects: reconciledProjects,
    skills: reconciledSkills,
    education: reconciledEducation,
  };
}

