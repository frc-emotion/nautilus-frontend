export interface ModalConfig {
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }

export interface ToastConfig {
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number; // Optional, defaults to 3000ms
}