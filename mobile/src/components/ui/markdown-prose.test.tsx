import { render, screen } from '@testing-library/react-native';

import { MarkdownProse, repairSplitBold } from './markdown-prose';

describe('repairSplitBold', () => {
  it('joins a closing ** that was pushed onto a later line', () => {
    expect(repairSplitBold('**Responsibilities\n\n**')).toBe('**Responsibilities**');
    expect(repairSplitBold('**When You Need To Apply\n**')).toBe('**When You Need To Apply**');
  });

  it('leaves well-formed inline bold and unrelated asterisks untouched', () => {
    expect(repairSplitBold('**Bold** and normal text')).toBe('**Bold** and normal text');
    expect(repairSplitBold('**A**\n\n**B**')).toBe('**A**\n\n**B**');
    expect(repairSplitBold('a * b * c')).toBe('a * b * c');
  });
});

describe('MarkdownProse', () => {
  it('renders a heading', async () => {
    await render(<MarkdownProse>{'## About the role'}</MarkdownProse>);
    expect(screen.getByText('About the role')).toBeTruthy();
  });

  it('renders a paragraph with inline bold and italic', async () => {
    await render(<MarkdownProse>{'Some **bold** and *italic* text.'}</MarkdownProse>);
    expect(screen.getByText('Some ')).toBeTruthy();
    expect(screen.getByText('bold')).toBeTruthy();
    expect(screen.getByText('italic')).toBeTruthy();
  });

  it('renders an unordered list with bullets', async () => {
    await render(<MarkdownProse>{'- Item one\n- Item two'}</MarkdownProse>);
    expect(screen.getAllByText('•')).toHaveLength(2);
    expect(screen.getByText('Item one')).toBeTruthy();
    expect(screen.getByText('Item two')).toBeTruthy();
  });

  it('renders an ordered list with numbers', async () => {
    await render(<MarkdownProse>{'1. First\n2. Second'}</MarkdownProse>);
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
  });

  it('renders a blockquote', async () => {
    await render(<MarkdownProse>{'> A quoted line'}</MarkdownProse>);
    expect(screen.getByText('A quoted line')).toBeTruthy();
  });

  it('renders inline code', async () => {
    await render(<MarkdownProse>{'Run `npm test` to verify.'}</MarkdownProse>);
    expect(screen.getByText('npm test')).toBeTruthy();
  });

  it('renders a code block', async () => {
    await render(<MarkdownProse>{'```\nconst x = 1\n```'}</MarkdownProse>);
    expect(screen.getByText('const x = 1')).toBeTruthy();
  });

  it('renders a horizontal rule without crashing', async () => {
    await render(<MarkdownProse>{'---'}</MarkdownProse>);
    // hr renders as a View with border-t; no text content, just a line.
    // Nothing to assert on — it just must not throw.
  });

  it('drops images — they are never meaningful in a scraped JD', async () => {
    const md = '![logo](https://example.com/logo.png)';
    await render(<MarkdownProse>{md}</MarkdownProse>);
    // The image is dropped; nothing renders its alt text or the URL
    expect(screen.queryByText('logo')).toBeNull();
    expect(screen.queryByText('https://example.com/logo.png')).toBeNull();
  });
});
