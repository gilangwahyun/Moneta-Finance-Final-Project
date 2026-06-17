// ─── Toast Provider ─────────────────────────────────────
// Wraps sonner's <Toaster> with responsive positioning:
//   Mobile:  bottom-center (above tab bar)
//   Desktop: bottom-right

"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "12px",
          fontSize: "13px",
          padding: "12px 16px",
        },
      }}
      richColors
      closeButton
    />
  );
}
