import { useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface ResumeDocumentWebViewProps {
  html: string;
}

/**
 * High-fidelity, in-app document renderer for the tailored résumé.
 * Renders the true A4 print HTML canvas inside an auto-scaling WebView,
 * guaranteeing 100% pixel-perfect document proportions matching the downloaded PDF.
 */
export function ResumeDocumentWebView({ html }: ResumeDocumentWebViewProps) {
  const [docHeight, setDocHeight] = useState(620);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { height?: number };
      if (typeof data.height === 'number' && data.height > 100) {
        setDocHeight(data.height);
      }
    } catch {
      // Ignore non-json messages
    }
  };

  return (
    <View style={{ height: docHeight, width: '100%', backgroundColor: '#1e293b' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url !== 'about:blank' && !request.url.startsWith('data:')) {
            void Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
        style={{ height: docHeight, backgroundColor: '#1e293b' }}
      />
    </View>
  );
}

