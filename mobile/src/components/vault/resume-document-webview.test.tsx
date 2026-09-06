import { render, screen } from '@testing-library/react-native';

import { ResumeDocumentWebView } from './resume-document-webview';

jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    WebView: (props: any) => <View testID="mock-webview" {...props} />,
  };
});

describe('ResumeDocumentWebView', () => {
  it('renders webview with provided html', async () => {
    await render(
      <ResumeDocumentWebView html="<html><body>Hello World</body></html>" />
    );
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });
});
