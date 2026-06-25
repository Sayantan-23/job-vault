import { redirect } from 'next/navigation'

// The standalone Dashboard (KPI grid) was removed in the editorial-shell redesign —
// the Jobs workspace is the home now. Kept as a redirect so old links/bookmarks
// and any cached client navigations still resolve.
export default function DashboardRedirect() {
  redirect('/app/jobs')
}
