/**
 * Centralized App Configuration & Branding
 *
 * Single source of truth for application identity, naming, tagline, and release metadata.
 * If the app name or branding changes, updating this file propagates across the entire mobile client.
 */
export const APP_CONFIG = {
  name: 'JobVault',
  shortName: 'JobVault',
  tagline: 'Your private career companion',
  version: '1.0.0',
  buildNumber: '1',
  packageId: 'com.jobvault.mobile',
  scheme: 'jobvault',
  links: {
    website: 'https://jobvault.app',
    privacy: 'https://jobvault.app/privacy',
    terms: 'https://jobvault.app/terms',
    support: 'mailto:support@jobvault.app',
    github: 'https://github.com/Sayantan-23/job-vault',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
