import { useLocalSearchParams } from 'expo-router';

import { ResumeScreen } from '@/components/vault/resume-screen';

export default function ResumeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ResumeScreen id={id} />;
}
