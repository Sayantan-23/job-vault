import { repairSplitBold } from './markdown-prose';

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
