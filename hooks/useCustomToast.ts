import { toast } from 'react-hot-toast';

export const useCustomToast = () => {
  const showSuccessToast = (message: string) => {
    toast.success(message, {
      position: 'top-right',
      style: {
        marginTop: '80px', // Add space for the loading bar
      },
    });
  };

  const showErrorToast = (message: string) => {
    toast.error(message, {
      position: 'top-right',
      style: {
        marginTop: '80px', // Add space for the loading bar
      },
    });
  };

  const showInfoToast = (message: string) => {
    toast(message, {
      position: 'top-right',
      style: {
        marginTop: '80px', // Add space for the loading bar
      },
    });
  };

  return { showSuccessToast, showErrorToast, showInfoToast };
}; 