import { useLocalSearchParams } from 'expo-router';

import { JobDetailScreen } from '@/components/jobs/job-detail-screen';

// Thin route → screen split (x-0cgq5d: a test file under src/app/ is bundled as
// a route and breaks the Android bundle). The root Stack renders this segment
// as a sibling of (tabs), so the tab bar is hidden — full screen.
export default function JobDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JobDetailScreen id={id} />;
}
