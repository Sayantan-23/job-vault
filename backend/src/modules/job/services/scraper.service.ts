import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { MarkdownService } from './markdown.service.js';

export interface ScrapeResult {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  snapshotMarkdown: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private genai: GoogleGenAI | null = null;

  constructor(private readonly markdownService: MarkdownService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genai = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not set — Gemini fallback scraping will be unavailable',
      );
    }
  }

  async scrape(url: string): Promise<ScrapeResult> {
    // 1. Fetch page HTML
    const html = await this.fetchHtml(url);

    // 2. Attempt Cheerio extraction
    const cheerioResult = this.cheerioExtract(html, url);

    // 3. If Cheerio extraction is incomplete (missing title or company), try Gemini
    if ((!cheerioResult.title || !cheerioResult.company) && this.genai) {
      this.logger.log(
        'Cheerio extraction incomplete, falling back to Gemini AI',
      );
      try {
        const geminiResult = await this.geminiExtract(html, url);
        return {
          title: geminiResult.title || cheerioResult.title || 'Untitled Position',
          company: geminiResult.company || cheerioResult.company || 'Unknown Company',
          location: geminiResult.location || cheerioResult.location,
          salaryRange: geminiResult.salaryRange || cheerioResult.salaryRange,
          snapshotMarkdown:
            geminiResult.snapshotMarkdown || cheerioResult.snapshotMarkdown || '',
        };
      } catch (error) {
        this.logger.error('Gemini fallback failed', error);
      }
    }

    // 4. Return best result from Cheerio (or defaults)
    return {
      title: cheerioResult.title || 'Untitled Position',
      company: cheerioResult.company || 'Unknown Company',
      location: cheerioResult.location,
      salaryRange: cheerioResult.salaryRange,
      snapshotMarkdown: cheerioResult.snapshotMarkdown || '',
    };
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  private cheerioExtract(html: string, url: string): Partial<ScrapeResult> {
    const $ = cheerio.load(html);
    const result: Partial<ScrapeResult> = {};

    // 1. Check for schema.org JobPosting JSON-LD
    const jsonLd = this.extractJsonLd($);
    if (jsonLd) {
      result.title = jsonLd.title as string | undefined;
      result.company = this.extractCompanyFromJsonLd(jsonLd);
      result.location = this.extractLocationFromJsonLd(jsonLd);
      result.salaryRange = this.extractSalaryFromJsonLd(jsonLd);
      if (jsonLd.description) {
        result.snapshotMarkdown = this.markdownService.htmlToMarkdown(
          jsonLd.description as string,
        );
      }
    }

    // 2. Try platform-specific selectors if JSON-LD didn't provide everything
    if (!result.title || !result.company) {
      const platformData = this.extractFromPlatformSelectors($, url);
      result.title = result.title || platformData.title;
      result.company = result.company || platformData.company;
      result.location = result.location || platformData.location;
    }

    // 3. Fall back to generic extraction
    if (!result.title) {
      result.title =
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        $('meta[property="og:title"]').attr('content')?.trim();
    }

    if (!result.company) {
      result.company =
        $('meta[property="og:site_name"]').attr('content')?.trim();
    }

    // 4. Convert main body to markdown if no description yet
    if (!result.snapshotMarkdown) {
      // Try to find the main content area
      const mainContent =
        $('main').html() ||
        $('[role="main"]').html() ||
        $('article').html() ||
        $('.job-description').html() ||
        $('#job-description').html() ||
        $('body').html();

      if (mainContent) {
        result.snapshotMarkdown =
          this.markdownService.htmlToMarkdown(mainContent);
      }
    }

    return result;
  }

  private extractJsonLd(
    $: cheerio.CheerioAPI,
  ): Record<string, unknown> | null {
    let jobPosting: Record<string, unknown> | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        // Handle single object or array
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (
            item['@type'] === 'JobPosting' ||
            (item['@graph'] &&
              Array.isArray(item['@graph']) &&
              (item['@graph'] as Record<string, unknown>[]).find(
                (g: Record<string, unknown>) => g['@type'] === 'JobPosting',
              ))
          ) {
            if (item['@type'] === 'JobPosting') {
              jobPosting = item;
            } else if (item['@graph']) {
              jobPosting =
                (item['@graph'] as Record<string, unknown>[]).find(
                  (g: Record<string, unknown>) => g['@type'] === 'JobPosting',
                ) || null;
            }
            return false; // break cheerio each
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    return jobPosting;
  }

  private extractCompanyFromJsonLd(
    jsonLd: Record<string, unknown>,
  ): string | undefined {
    const hiringOrg = jsonLd.hiringOrganization as
      | Record<string, unknown>
      | string
      | undefined;
    if (typeof hiringOrg === 'string') return hiringOrg;
    if (hiringOrg && typeof hiringOrg === 'object') {
      return (hiringOrg.name as string) || undefined;
    }
    return undefined;
  }

  private extractLocationFromJsonLd(
    jsonLd: Record<string, unknown>,
  ): string | undefined {
    const loc = jsonLd.jobLocation as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined;
    if (!loc) return undefined;

    const locations = Array.isArray(loc) ? loc : [loc];
    const parts: string[] = [];

    for (const location of locations) {
      const address = location.address as Record<string, unknown> | undefined;
      if (address) {
        const city = (address.addressLocality as string) || '';
        const state = (address.addressRegion as string) || '';
        const country = (address.addressCountry as string) || '';
        const part = [city, state, country].filter(Boolean).join(', ');
        if (part) parts.push(part);
      }
    }

    return parts.length > 0 ? parts.join(' | ') : undefined;
  }

  private extractSalaryFromJsonLd(
    jsonLd: Record<string, unknown>,
  ): string | undefined {
    const salary = jsonLd.baseSalary as Record<string, unknown> | undefined;
    if (!salary) return undefined;

    const value = salary.value as Record<string, unknown> | number | undefined;
    const currency = (salary.currency as string) || '';

    if (typeof value === 'number') {
      return `${currency} ${value}`.trim();
    }

    if (value && typeof value === 'object') {
      const minValue = value.minValue as number | undefined;
      const maxValue = value.maxValue as number | undefined;
      const unitText = (value.unitText as string) || '';

      if (minValue && maxValue) {
        return `${currency} ${minValue} - ${maxValue} ${unitText}`.trim();
      }
      if (minValue) {
        return `${currency} ${minValue}+ ${unitText}`.trim();
      }
    }

    return undefined;
  }

  private extractFromPlatformSelectors(
    $: cheerio.CheerioAPI,
    url: string,
  ): Partial<ScrapeResult> {
    const result: Partial<ScrapeResult> = {};

    if (url.includes('linkedin.com')) {
      result.title =
        $('.top-card-layout__title').text().trim() ||
        $('h1.topcard__title').text().trim();
      result.company =
        $('.topcard__org-name-link').text().trim() ||
        $('a.topcard__org-name-link').text().trim() ||
        $('.top-card-layout__company-name').text().trim();
      result.location =
        $('.topcard__flavor--bullet').text().trim() ||
        $('.top-card-layout__bullet').text().trim();
    } else if (url.includes('indeed.com')) {
      result.title =
        $('[data-testid="jobsearch-JobInfoHeader-title"]').text().trim() ||
        $('.jobsearch-JobInfoHeader-title').text().trim() ||
        $('h1.icl-u-xs-mb--xs').text().trim();
      result.company =
        $('[data-testid="inlineHeader-companyName"]').text().trim() ||
        $('[data-company-name="true"]').text().trim();
      result.location =
        $('[data-testid="job-location"]').text().trim() ||
        $('[data-testid="inlineHeader-companyLocation"]').text().trim();
    } else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
      result.title = $('#header .app-title').text().trim();
      result.company = $('#header .company-name').text().trim();
      result.location = $('.location').first().text().trim();
    } else if (url.includes('lever.co')) {
      result.title = $('h2.posting-headline').text().trim() ||
        $('.posting-headline h2').text().trim();
      result.company = $('[data-qa="company-name"]').text().trim();
      result.location = $('[data-qa="posting-categories"]').find('.sort-by-time').first().text().trim() ||
        $('.posting-categories .location').text().trim();
    }

    return result;
  }

  private async geminiExtract(
    html: string,
    _url: string,
  ): Promise<Partial<ScrapeResult>> {
    if (!this.genai) {
      return {};
    }

    // Truncate HTML to avoid token limits
    const truncatedHtml = html.slice(0, 30000);

    const prompt = `Extract job posting details from the following HTML. Return ONLY a valid JSON object with these fields:
- title: the job title (string)
- company: the company name (string)
- location: the job location if available (string or null)
- salaryRange: the salary range if available (string or null)
- description: the full job description in clean HTML (string)

HTML:
${truncatedHtml}`;

    const response = await this.genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text || '';

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn('Gemini response did not contain valid JSON');
      return {};
    }

    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        title: parsed.title || undefined,
        company: parsed.company || undefined,
        location: parsed.location || undefined,
        salaryRange: parsed.salaryRange || parsed.salary_range || undefined,
        snapshotMarkdown: parsed.description
          ? this.markdownService.htmlToMarkdown(parsed.description)
          : undefined,
      };
    } catch {
      this.logger.warn('Failed to parse Gemini JSON response');
      return {};
    }
  }
}
