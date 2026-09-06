import { useLocalSearchParams } from 'expo-router';

import { CoverLetterScreen } from '@/components/vault/cover-letter-screen';

export default function CoverLetterRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CoverLetterScreen id={id} />;
}
