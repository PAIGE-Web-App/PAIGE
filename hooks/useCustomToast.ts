import { toast } from 'react-hot-toast';

export const useCustomToast = () => {
  const showSuccessToast = (message: string) => {
    toast.success(message);
  };

  const showErrorToast = (message: string) => {
    toast.error(message);
  };

  const showInfoToast = (message: string) => {
    toast(message);
  };

  return { showSuccessToast, showErrorToast, showInfoToast };
}; 