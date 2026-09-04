import { render, screen } from '@testing-library/react-native';

import { JobSnapshot } from './job-snapshot';

describe('JobSnapshot', () => {
  it('renders the markdown via MarkdownProse', async () => {
    await render(
      <JobSnapshot
        markdown={'## About the role\n\nWe build things.'}
        sourceUrl={null}
      />,
    );
    expect(screen.getByText('About the role')).toBeTruthy();
    expect(screen.getByText('We build things.')).toBeTruthy();
  });

  it('shows the empty state when no snapshot was captured', async () => {
    await render(<JobSnapshot markdown={null} sourceUrl={null} />);
    expect(
      screen.getByText('No snapshot was captured for this job.'),
    ).toBeTruthy();
  });

  it('renders a Source link when a sourceUrl is present', async () => {
    await render(
      <JobSnapshot markdown={'x'} sourceUrl="https://example.com/posting" />,
    );
    expect(screen.getByLabelText('View original posting')).toBeTruthy();
  });
});
