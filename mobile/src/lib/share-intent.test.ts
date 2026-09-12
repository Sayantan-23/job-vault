import { isShareIntentSupported, parseShareIntent } from './share-intent';

describe('share-intent', () => {
  describe('isShareIntentSupported', () => {
    it('returns true in test environment', () => {
      expect(isShareIntentSupported()).toBe(true);
    });
  });

  describe('parseShareIntent', () => {
    it('returns null when input is undefined or null', () => {
      expect(parseShareIntent(null)).toBeNull();
      expect(parseShareIntent(undefined)).toBeNull();
    });

    it('extracts direct webUrl', () => {
      const parsed = parseShareIntent({
        webUrl: 'https://stripe.com/jobs/senior-eng',
        text: 'Stripe Careers',
      });
      expect(parsed).toEqual({
        url: 'https://stripe.com/jobs/senior-eng',
        rawText: 'Stripe Careers',
      });
    });

    it('extracts embedded URL from shared text string', () => {
      const parsed = parseShareIntent({
        text: 'Check out this position on LinkedIn: https://www.linkedin.com/jobs/view/123456789/ - Apply soon!',
      });
      expect(parsed).toEqual({
        url: 'https://www.linkedin.com/jobs/view/123456789/',
        rawText:
          'Check out this position on LinkedIn: https://www.linkedin.com/jobs/view/123456789/ - Apply soon!',
      });
    });

    it('returns rawText when text contains no URL', () => {
      const parsed = parseShareIntent({
        text: 'Senior Software Engineer at Acme Corp',
      });
      expect(parsed).toEqual({
        rawText: 'Senior Software Engineer at Acme Corp',
      });
    });

    it('returns null when text is empty whitespace', () => {
      const parsed = parseShareIntent({
        text: '   ',
      });
      expect(parsed).toBeNull();
    });
  });
});
