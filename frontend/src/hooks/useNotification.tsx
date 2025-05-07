import React from "react";
import {
  toast,
  ToastOptions,
  Id,
  ToastContainer as ToastifyContainer,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled, { createGlobalStyle } from "styled-components";

export type NotificationType = "success" | "error" | "warning" | "info";

// Position type to allow for custom positioning
export interface NotificationPosition {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

// Global styles to ensure Fira Code is applied to toasts
const ToastGlobalStyle = createGlobalStyle`
  .Toastify__toast {
    font-family: "Fira Code", monospace !important;
  }
`;

// Styled ToastContainer
const StyledToastContainer = styled(ToastifyContainer)`
  .Toastify__toast {
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    font-family: "Fira Code", monospace !important;
  }

  .Toastify__toast-container {
    z-index: 9999;
  }

  /* Style for each toast type */
  .Toastify__toast--success {
    background: var(--color-success, #4caf50);
  }

  .Toastify__toast--error {
    background: var(--color-error, #d32f2f);
  }

  .Toastify__toast--warning {
    background: var(--color-warning, #ff9800);
  }

  .Toastify__toast--info {
    background: var(--color-info, #2196f3);
  }

  .Toastify__progress-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.7);
  }
`;

export interface ToastContainerProps {
  position?:
    | "top-right"
    | "top-center"
    | "top-left"
    | "bottom-right"
    | "bottom-center"
    | "bottom-left";
  autoClose?: number;
  hideProgressBar?: boolean;
  newestOnTop?: boolean;
  closeOnClick?: boolean;
  theme?: "light" | "dark" | "colored";
}

const defaultContainerProps: ToastContainerProps = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  theme: "colored",
};

export const ToastContainer: React.FC<ToastContainerProps> = (props) => {
  return (
    <>
      <ToastGlobalStyle />
      <StyledToastContainer {...defaultContainerProps} {...props} />
    </>
  );
};

export function useNotification() {
  const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    style: { fontFamily: '"Fira Code", monospace' },
  };

  // Convert position object to react-toastify position type
  const getToastPosition = (
    position?: NotificationPosition
  ): ToastOptions["position"] => {
    if (!position) return defaultOptions.position as ToastOptions["position"];

    // Handle centered notifications
    if (position.top === "50%" && position.left === "50%") {
      return "top-center";
    }

    // Standard positions
    if (position.top) {
      return position.right ? "top-right" : "top-left";
    } else {
      return position.right ? "bottom-right" : "bottom-left";
    }
  };

  return {
    success: (
      message: string,
      duration?: number,
      position?: NotificationPosition
    ): Id =>
      toast.success(message, {
        ...defaultOptions,
        position: getToastPosition(position),
        autoClose: duration || defaultOptions.autoClose,
      }),

    error: (
      message: string,
      duration?: number,
      position?: NotificationPosition
    ): Id =>
      toast.error(message, {
        ...defaultOptions,
        position: getToastPosition(position),
        autoClose: duration || defaultOptions.autoClose,
      }),

    warning: (
      message: string,
      duration?: number,
      position?: NotificationPosition
    ): Id =>
      toast.warning(message, {
        ...defaultOptions,
        position: getToastPosition(position),
        autoClose: duration || defaultOptions.autoClose,
      }),

    info: (
      message: string,
      duration?: number,
      position?: NotificationPosition
    ): Id =>
      toast.info(message, {
        ...defaultOptions,
        position: getToastPosition(position),
        autoClose: duration || defaultOptions.autoClose,
      }),

    dismiss: (id?: Id): void => toast.dismiss(id),

    dismissAll: (): void => toast.dismiss(),
  };
}

export default useNotification;
