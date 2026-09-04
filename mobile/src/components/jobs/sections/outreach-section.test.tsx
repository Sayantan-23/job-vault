import { parseContact } from './outreach-section';
import type { JobContact } from '@/types/contact';

const base: JobContact = {
  id: 'c1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  jobId: 'j1',
  contact: '',
  channel: null,
  status: 'NO_RESPONSE',
  reachedOutAt: '2026-09-01T00:00:00Z',
  notes: null,
};

describe('parseContact', () => {
  it('extracts an email and builds a mailto: href', () => {
    const c = { ...base, contact: 'Reach out to jane@acme.co for a referral' };
    const t = parseContact(c);
    expect(t.kind).toBe('email');
    expect(t.value).toBe('jane@acme.co');
    expect(t.href).toBe('mailto:jane@acme.co');
  });

  it('honours an EMAIL channel hint to prefer mailto', () => {
    const c = {
      ...base,
      contact: 'jane@acme.co',
      channel: 'EMAIL' as const,
    };
    const t = parseContact(c);
    expect(t.kind).toBe('email');
    expect(t.href).toBe('mailto:jane@acme.co');
  });

  it('extracts a phone number and builds a tel: href (digits-only)', () => {
    const c = { ...base, contact: 'Call the recruiter at (415) 555-1234' };
    const t = parseContact(c);
    expect(t.kind).toBe('phone');
    expect(t.value).toBe('(415) 555-1234');
    expect(t.href).toBe('tel:4155551234');
  });

  it('falls back to plain text when no email or phone is found', () => {
    const c = { ...base, contact: 'LinkedIn: jane-doe' };
    const t = parseContact(c);
    expect(t.kind).toBe('none');
    expect(t.value).toBe('LinkedIn: jane-doe');
    expect(t.href).toBeNull();
  });
});
