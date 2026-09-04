import { JobsScreen } from '@/components/jobs/jobs-screen';

// Jobs is the home tab. The FAB's add-job onPress stays a no-op until C5 wires
// the add-job flow — left in place, not removed.
export default function JobsRoute() {
  return <JobsScreen />;
}
