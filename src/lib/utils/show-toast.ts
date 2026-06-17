/********** Imports **********/
import { toast } from "sonner";

/********** Helpers **********/
/**
 * Show a sync-aware toast.
 *
 * Displays a green success toast when online.
 * Displays a gray/blue info toast with an offline hint when offline.
 *
 * @param onlineMessage - Message to show when online.
 * @param offlineMessage - Optional custom message to show when offline.
 */
export function showSyncToast(
  onlineMessage: string,
  offlineMessage?: string
) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    toast.success(onlineMessage);
  } else {
    toast(offlineMessage || "Saved offline. Will sync when connected.", {
      icon: "☁️",
    });
  }
}

/**
 * Show a destructive action toast.
 *
 * @param message - Message to show indicating a successful deletion.
 */
export function showDeleteToast(message: string = "Deleted successfully") {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    toast.success(message);
  } else {
    toast(message + " (will sync when online)", { icon: "☁️" });
  }
}

/**
 * Show an error toast.
 *
 * @param message - The error message to display.
 */
export function showErrorToast(message: string) {
  toast.error(message);
}
