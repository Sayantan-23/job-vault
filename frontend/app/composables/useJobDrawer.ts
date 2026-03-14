import type { Job, UpdateJobRequest } from '~/types/job';
import type { ApiResponse } from '~/types/api';

/**
 * Manages the job detail drawer state: open/close, selected job, CRUD operations.
 * Uses useState for shared state across components.
 */
export function useJobDrawer() {
  const isOpen = useState<boolean>('job-drawer-open', () => false);
  const selectedJobId = useState<string | null>('job-drawer-selected-id', () => null);
  const selectedJob = useState<Job | null>('job-drawer-selected-job', () => null);
  const isLoading = useState<boolean>('job-drawer-loading', () => false);

  const api = useApi();
  const toast = useToastNotify();

  /**
   * Open the drawer and fetch the full job detail.
   */
  function openDrawer(jobId: string): void {
    selectedJobId.value = jobId;
    isOpen.value = true;
    fetchJobDetail(jobId);
  }

  /**
   * Close the drawer and clear the selected job.
   */
  function closeDrawer(): void {
    isOpen.value = false;
    selectedJobId.value = null;
    selectedJob.value = null;
  }

  /**
   * Fetch full job details from the API.
   */
  async function fetchJobDetail(jobId: string): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get<ApiResponse<Job>>(`/jobs/${jobId}`);
      selectedJob.value = response.data;
    } catch {
      toast.error('Failed to load job details.');
      closeDrawer();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update the currently selected job with partial data.
   */
  async function updateJob(data: UpdateJobRequest): Promise<Job | null> {
    if (!selectedJobId.value) return null;

    try {
      const response = await api.patch<ApiResponse<Job>>(
        `/jobs/${selectedJobId.value}`,
        data,
      );
      selectedJob.value = response.data;
      return response.data;
    } catch {
      toast.error('Failed to update job.');
      return null;
    }
  }

  /**
   * Delete the currently selected job.
   */
  async function deleteJob(): Promise<boolean> {
    if (!selectedJobId.value) return false;

    try {
      await api.delete(`/jobs/${selectedJobId.value}`);
      toast.success('Job deleted successfully.');
      closeDrawer();
      return true;
    } catch {
      toast.error('Failed to delete job.');
      return false;
    }
  }

  return {
    isOpen,
    selectedJobId,
    selectedJob,
    isLoading,
    openDrawer,
    closeDrawer,
    fetchJobDetail,
    updateJob,
    deleteJob,
  };
}
