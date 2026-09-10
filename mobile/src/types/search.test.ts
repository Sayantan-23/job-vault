import { searchResultHref, type SearchResult } from './search';

describe('searchResultHref', () => {
  it('maps job result to job detail screen route', () => {
    const res: SearchResult = {
      type: 'job',
      id: 'job-123',
      title: 'Staff Engineer',
      subtitle: 'Acme Corp',
      snippet: null,
    };
    expect(searchResultHref(res)).toBe('/jobs/job-123');
  });

  it('maps resume result to vault resume route', () => {
    const res: SearchResult = {
      type: 'resume',
      id: 'res-456',
      title: 'Full Stack Resume',
      subtitle: null,
      snippet: null,
    };
    expect(searchResultHref(res)).toBe('/vault/resume/res-456');
  });

  it('maps coverLetter result to vault cover-letter route', () => {
    const res: SearchResult = {
      type: 'coverLetter',
      id: 'cl-789',
      title: 'Cover Letter Acme',
      subtitle: null,
      snippet: null,
    };
    expect(searchResultHref(res)).toBe('/vault/cover-letter/cl-789');
  });

  it('maps persona result to persona editor route', () => {
    const res: SearchResult = {
      type: 'persona',
      id: 'per-101',
      title: 'Senior Frontend Lead',
      subtitle: null,
      snippet: null,
    };
    expect(searchResultHref(res)).toBe('/personas/per-101');
  });

  it('maps answer result to answers tab with answer query param', () => {
    const res: SearchResult = {
      type: 'answer',
      id: 'ans-202',
      title: 'Why JobVault?',
      subtitle: 'Culture',
      snippet: null,
    };
    expect(searchResultHref(res)).toBe('/(tabs)/answers?answer=ans-202');
  });
});
