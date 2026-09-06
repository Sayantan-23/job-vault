import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { jobOptionsKey } from '@/lib/query-keys';
import type { Job } from '@/types/job';

export interface JobOption {
  id: string;
  title: string;
  company: string;
}

/** Lightweight list of the user's jobs (id, title, company) for tailoring selectors. */
export function useJobOptions() {
  return useQuery({
    queryKey: jobOptionsKey,
    queryFn: async (): Promise<JobOption[]> => {
      const jobs =
        (await apiClient.get<Job[]>('/api/jobs?limit=100&sortBy=createdAt&sortOrder=desc')) ?? [];
      return jobs.map((j) => ({ id: j.id, title: j.title, company: j.company }));
    },
  });
}
