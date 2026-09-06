import { render, screen } from '@testing-library/react-native';
import { CoverLetterDiff } from './cover-letter-diff';

describe('CoverLetterDiff', () => {
  it('renders unchanged text normally', async () => {
    await render(<CoverLetterDiff current="Hello world" proposed="Hello world" />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders deletions with strikethrough and insertions with highlight', async () => {
    await render(
      <CoverLetterDiff
        current="I am writing to apply for the role."
        proposed="I am delighted to apply for the position."
      />
    );

    expect(screen.getByLabelText('Deleted: writing')).toBeTruthy();
    expect(screen.getByLabelText('Inserted: delighted')).toBeTruthy();
    expect(screen.getByLabelText('Deleted: role.')).toBeTruthy();
    expect(screen.getByLabelText('Inserted: position.')).toBeTruthy();
  });
});
