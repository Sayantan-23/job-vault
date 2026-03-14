/**
 * Shared state for the Add Job modal open/close.
 * Used by AppHeader (button trigger) and dashboard page (modal host).
 */
export function useAddJobModal() {
  const isOpen = useState<boolean>('add-job-modal-open', () => false);

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  return { isOpen, open, close };
}
