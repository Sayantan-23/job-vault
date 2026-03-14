/**
 * Wrapper around Nuxt UI useToast() with preset configurations
 * for success, error, warning, and info notifications.
 */
export function useToastNotify() {
  const toast = useToast();

  function success(message: string) {
    toast.add({
      title: 'Success',
      description: message,
      color: 'success',
      icon: 'i-lucide-check-circle',
      duration: 5000,
    });
  }

  function error(message: string) {
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-x',
      duration: 7000,
    });
  }

  function warning(message: string) {
    toast.add({
      title: 'Warning',
      description: message,
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
      duration: 5000,
    });
  }

  function info(message: string) {
    toast.add({
      title: 'Info',
      description: message,
      color: 'info',
      icon: 'i-lucide-info',
      duration: 5000,
    });
  }

  return { success, error, warning, info };
}
