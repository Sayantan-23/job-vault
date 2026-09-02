import { LoginForm } from '@/components/auth/login-form';

// Thin route, as on the web (`app/(auth)/login/page.tsx`): the form is a
// component so it can be tested. A test file under src/app/ would be swept into
// expo-router's require.context and bundled as a route — it fails the export.
export default function LoginScreen() {
  return <LoginForm />;
}
