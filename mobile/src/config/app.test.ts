import { APP_CONFIG } from './app';

describe('APP_CONFIG', () => {
  it('defines the core application identity metadata', () => {
    expect(APP_CONFIG.name).toBeTruthy();
    expect(APP_CONFIG.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_CONFIG.packageId).toBe('com.jobvault.mobile');
    expect(APP_CONFIG.scheme).toBe('jobvault');
  });

  it('provides essential web and support links', () => {
    expect(APP_CONFIG.links.website).toMatch(/^https?:\/\//);
    expect(APP_CONFIG.links.privacy).toMatch(/^https?:\/\//);
    expect(APP_CONFIG.links.support).toMatch(/^mailto:/);
  });
});
