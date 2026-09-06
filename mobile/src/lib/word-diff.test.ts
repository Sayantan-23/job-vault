import { diffWords } from './word-diff';

describe('diffWords', () => {
  it('returns equal segments when strings match', () => {
    const res = diffWords('hello world', 'hello world');
    expect(res).toEqual([{ op: 'equal', text: 'hello world' }]);
  });

  it('detects single word replacement', () => {
    const res = diffWords('I am happy', 'I am thrilled');
    expect(res).toEqual([
      { op: 'equal', text: 'I am ' },
      { op: 'delete', text: 'happy' },
      { op: 'insert', text: 'thrilled' },
    ]);
  });

  it('detects insertions', () => {
    const res = diffWords('hello world', 'hello brave new world');
    expect(res).toEqual([
      { op: 'equal', text: 'hello ' },
      { op: 'insert', text: 'brave new ' },
      { op: 'equal', text: 'world' },
    ]);
  });

  it('detects deletions', () => {
    const res = diffWords('hello brave new world', 'hello world');
    expect(res).toEqual([
      { op: 'equal', text: 'hello ' },
      { op: 'delete', text: 'brave new ' },
      { op: 'equal', text: 'world' },
    ]);
  });
});
