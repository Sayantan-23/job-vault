import { dayGroupLabel, dayKey, relativeTime, shortDate } from './relative-time';

describe('relativeTime', () => {
  const now = new Date('2026-09-06T12:00:00Z');

  it('returns em dash for null or invalid inputs', () => {
    expect(relativeTime(null, now)).toBe('—');
    expect(relativeTime(undefined, now)).toBe('—');
    expect(relativeTime('not-a-date', now)).toBe('—');
  });

  it('formats minute ranges', () => {
    expect(relativeTime('2026-09-06T11:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-09-06T11:55:00Z', now)).toBe('5 minutes ago');
  });

  it('formats hour ranges', () => {
    expect(relativeTime('2026-09-06T10:00:00Z', now)).toBe('2 hours ago');
  });

  it('formats day ranges', () => {
    expect(relativeTime('2026-09-04T12:00:00Z', now)).toBe('2 days ago');
  });
});

describe('shortDate', () => {
  it('formats short date correctly', () => {
    expect(shortDate('2026-09-06T12:00:00Z')).toBe('Sep 6');
    expect(shortDate('')).toBe('—');
  });
});

describe('dayKey & dayGroupLabel', () => {
  const now = new Date(2026, 8, 6, 12, 0, 0); // Sep 6, 2026

  it('produces stable dayKey', () => {
    const key = dayKey(new Date(2026, 8, 6).toISOString());
    expect(key).toBe('2026-8-6');
    expect(dayKey('invalid')).toBe('');
  });

  it('produces Today, Yesterday, and day labels', () => {
    const today = new Date(2026, 8, 6).toISOString();
    const yesterday = new Date(2026, 8, 5).toISOString();
    const threeDaysAgo = new Date(2026, 8, 3).toISOString();
    const monthAgo = new Date(2026, 7, 1).toISOString();

    expect(dayGroupLabel(today, now)).toBe('Today');
    expect(dayGroupLabel(yesterday, now)).toBe('Yesterday');
    expect(dayGroupLabel(threeDaysAgo, now)).toBe('Thursday');
    expect(dayGroupLabel(monthAgo, now)).toContain('2026');
  });
});
