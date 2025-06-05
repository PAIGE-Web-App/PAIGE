// hooks/useCustomToast.ts (or utils/toastUtils.ts)
import toast from "react-hot-toast";

export const useCustomToast = () => {
  const showSuccessToast = (message: string) => {
    toast.dismiss(); // Dismiss any existing toasts
    toast.success(message);
  };

  const showErrorToast = (message: string) => {
    toast.dismiss(); // Dismiss any existing toasts
    toast.error(message);
  };

  const showInfoToast = (message: string) => {
    toast.dismiss(); // Dismiss any existing toasts
    toast(message); // Default toast for info/general messages
  };

  return { showSuccessToast, showErrorToast, showInfoToast };
};