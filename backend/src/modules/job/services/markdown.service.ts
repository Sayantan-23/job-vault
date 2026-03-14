import { Injectable } from '@nestjs/common';
import TurndownService from 'turndown';

@Injectable()
export class MarkdownService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Remove scripts, styles, nav, and footer elements
    this.turndownService.remove(['script', 'style', 'nav', 'footer', 'noscript', 'iframe']);
  }

  htmlToMarkdown(html: string): string {
    if (!html) {
      return '';
    }

    // Strip HTML tags that Turndown might not handle well
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    let markdown = this.turndownService.turndown(cleaned);

    // Clean up excessive whitespace
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();

    return markdown;
  }
}
