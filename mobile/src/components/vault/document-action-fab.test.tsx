import { render, screen, fireEvent } from '@testing-library/react-native';
import { DocumentActionFab } from './document-action-fab';

describe('DocumentActionFab', () => {
  const mockCopy = jest.fn();
  const mockShare = jest.fn();
  const mockDownload = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders closed FAB by default with accessibility label', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    expect(screen.getByLabelText('Document actions')).toBeTruthy();
    expect(screen.queryByText('Copy Text')).toBeNull();
    expect(screen.queryByText('Share PDF')).toBeNull();
    expect(screen.queryByText('Download PDF')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('reveals copy, share, download, and delete actions upon clicking the FAB', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));

    expect(screen.getByText('Copy Text')).toBeTruthy();
    expect(screen.getByText('Share PDF')).toBeTruthy();
    expect(screen.getByText('Download PDF')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('triggers copy action on selection', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));
    await fireEvent.press(screen.getByLabelText('Copy plain text to clipboard'));

    expect(mockCopy).toHaveBeenCalledTimes(1);
  });

  it('triggers share action on selection', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));
    await fireEvent.press(screen.getByLabelText('Share PDF'));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('triggers download action on selection', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));
    await fireEvent.press(screen.getByLabelText('Download PDF'));

    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it('triggers delete action on selection', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));
    await fireEvent.press(screen.getByLabelText('Delete document'));

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('reflects copied, sharing, and downloading states in labels', async () => {
    await render(
      <DocumentActionFab
        onCopy={mockCopy}
        onShare={mockShare}
        onDownload={mockDownload}
        onDelete={mockDelete}
        copied={true}
        sharing={true}
        downloading={true}
      />
    );

    await fireEvent.press(screen.getByLabelText('Document actions'));

    expect(screen.getByText('Copied')).toBeTruthy();
    expect(screen.getByText('Sharing…')).toBeTruthy();
    expect(screen.getByText('Downloading…')).toBeTruthy();
  });
});
