import { toast } from "sonner";

export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 5000,
  });
}

export function showErrorToast(message: string) {
  toast.error(message, {
    duration: 5000,
  });
} 