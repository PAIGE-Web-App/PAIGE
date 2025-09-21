import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

export const useCustomToast = () => {
  const showSuccessToast = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showErrorToast = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const showInfoToast = useCallback((message: string) => {
    toast(message);
  }, []);

  return { showSuccessToast, showErrorToast, showInfoToast };
}; 