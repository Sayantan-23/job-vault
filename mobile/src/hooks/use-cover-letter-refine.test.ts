import { act, renderHook } from '@testing-library/react-native';

import { useRefineCoverLetter } from '@/hooks/use-cover-letters';
import { useCoverLetterRefine } from './use-cover-letter-refine';

jest.mock('@/hooks/use-cover-letters', () => ({
  useRefineCoverLetter: jest.fn(),
}));

describe('useCoverLetterRefine', () => {
  let mockMutate: jest.Mock;
  let mockReset: jest.Mock;
  let onApply: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onApply = jest.fn();
    mockMutate = jest.fn();
    mockReset = jest.fn();
    (useRefineCoverLetter as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      reset: mockReset,
      isPending: false,
      error: null,
    });
  });

  it('runs refine and stages candidate on success', async () => {
    const { result } = await renderHook(() =>
      useCoverLetterRefine('cl-1', 'Initial body', onApply)
    );

    expect(result.current.staged).toBe(false);

    await act(async () => {
      result.current.run('shorten', 'make it brief');
    });

    expect(mockMutate).toHaveBeenCalledWith(
      { action: 'shorten', instructions: 'make it brief' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );

    // Trigger onSuccess
    const onSuccess = mockMutate.mock.calls[0][1].onSuccess;
    await act(async () => {
      onSuccess({ bodyMarkdown: 'Shorter body' });
    });

    expect(result.current.staged).toBe(true);
    expect(result.current.candidate).toBe('Shorter body');
    expect(result.current.lastAction).toBe('shorten');
  });

  it('keeps candidate, applies it, and allows undo', async () => {
    const { result } = await renderHook(() =>
      useCoverLetterRefine('cl-1', 'Initial body', onApply)
    );

    await act(async () => {
      result.current.run('humanize');
    });

    const onSuccess = mockMutate.mock.calls[0][1].onSuccess;
    await act(async () => {
      onSuccess({ bodyMarkdown: 'Humanized body' });
    });

    // Keep
    await act(async () => {
      result.current.keep();
    });

    expect(onApply).toHaveBeenCalledWith('Humanized body');
    expect(result.current.staged).toBe(false);
    expect(result.current.undoBody).toBe('Initial body');

    // Undo
    await act(async () => {
      result.current.undo();
    });

    expect(onApply).toHaveBeenCalledWith('Initial body');
    expect(result.current.undoBody).toBeNull();
  });

  it('discards candidate without applying', async () => {
    const { result } = await renderHook(() =>
      useCoverLetterRefine('cl-1', 'Initial body', onApply)
    );

    await act(async () => {
      result.current.run('fix-grammar');
    });

    const onSuccess = mockMutate.mock.calls[0][1].onSuccess;
    await act(async () => {
      onSuccess({ bodyMarkdown: 'Grammar fixed' });
    });

    await act(async () => {
      result.current.discard();
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(result.current.staged).toBe(false);
    expect(result.current.candidate).toBeNull();
  });
});
