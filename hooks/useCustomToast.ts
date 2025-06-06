import toast from "react-hot-toast";

export const useCustomToast = () => {
  const showSuccessToast = (message: string) => {
    toast.dismiss();
    toast.success(message);
  };

  const showErrorToast = (message: string) => {
    toast.dismiss();
    toast.error(message);
  };

  const showInfoToast = (message: string) => {
    toast.dismiss();
    toast(message);
  };

  return { showSuccessToast, showErrorToast, showInfoToast };
}; 