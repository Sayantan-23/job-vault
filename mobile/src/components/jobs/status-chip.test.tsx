import { render, screen } from '@testing-library/react-native';

import { StatusChip } from './status-chip';

describe('StatusChip', () => {
  it('renders status label with accessibility text', async () => {
    await render(<StatusChip status="APPLIED" />);
    expect(screen.getByText('Applied')).toBeTruthy();
    expect(screen.getByLabelText('Status: Applied')).toBeTruthy();
  });

  it('renders interviewing status', async () => {
    await render(<StatusChip status="INTERVIEWING" />);
    expect(screen.getByText('Interviewing')).toBeTruthy();
    expect(screen.getByLabelText('Status: Interviewing')).toBeTruthy();
  });
});
