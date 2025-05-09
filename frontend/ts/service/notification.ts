import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

/**
 * Display a notification message with various types and customizable position
 * @param {string} type - Notification type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Message to display
 * @param {number} duration - Duration to show notification (ms), default 3000ms
 * @param {object} position - Position of notification, default {top: '20px', right: '20px'}
 */
export const showNotification = (
  type: "success" | "error" | "warning" | "info",
  message: string,
  duration: number = 3000,
  position: { top?: string; right?: string; bottom?: string; left?: string } = {
    top: "20px",
    right: "20px",
  }
): void => {
  // Define notification styling options based on type
  const notificationStyles: Record<
    string,
    { background: string; icon: string }
  > = {
    success: {
      background: "rgba(40,167,69,0.9)",
      icon: "fa-check-circle",
    },
    error: {
      background: "rgba(220,53,69,0.9)",
      icon: "fa-exclamation-circle",
    },
    warning: {
      background: "rgba(255,193,7,0.9)",
      icon: "fa-exclamation-triangle",
    },
    info: {
      background: "rgba(23,162,184,0.9)",
      icon: "fa-info-circle",
    },
  };

  // Get style settings for the notification type
  const { background, icon } = notificationStyles[type];
  const formattedMessage = `<i class="fas ${icon}"></i> ${message}`;

  // Check if we're centering (typically for easter eggs or important messages)
  const isCentered = position.top === "50%" && position.left === "50%";

  // Special handling for centered notifications
  if (isCentered) {
    createCenteredNotification(formattedMessage, background, duration);
  } else {
    createToastNotification(formattedMessage, background, duration, position);
  }
};

/**
 * Creates a centered custom notification
 * @param {string} message - Formatted HTML message with icon
 * @param {string} backgroundColor - Background color
 * @param {number} duration - How long to show the notification
 */
function createCenteredNotification(
  message: string,
  backgroundColor: string,
  duration: number
): void {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = "cincout-notification";
  notification.innerHTML = message;

  // Apply styles
  Object.assign(notification.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: backgroundColor,
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    zIndex: "9999",
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
    fontSize: "16px",
    textAlign: "center",
    maxWidth: "80%",
    transition: "opacity 0.5s ease",
    opacity: "0",
  });

  // Add to DOM and animate in
  document.body.appendChild(notification);
  requestAnimationFrame(() => {
    notification.style.opacity = "1";
  });

  // Remove after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.parentNode?.removeChild(notification), 500);
  }, duration);
}

/**
 * Creates a toast notification using Toastify
 * @param {string} message - Formatted HTML message with icon
 * @param {string} backgroundColor - Background color
 * @param {number} duration - How long to show the notification
 * @param {object} position - Position settings
 */
function createToastNotification(
  message: string,
  backgroundColor: string,
  duration: number,
  position: { top?: string; right?: string; bottom?: string; left?: string }
): void {
  // Determine gravity and position for Toastify
  const gravity: "top" | "bottom" = position.bottom ? "bottom" : "top";
  const positionX: "left" | "right" | "center" = position.left
    ? "left"
    : "right";

  // Extract position styles
  const positionStyle: Record<string, string> = {};
  Object.entries(position).forEach(([key, value]) => {
    if (value) positionStyle[key] = value;
  });

  // Create toast notification
  Toastify({
    text: message,
    duration: duration,
    gravity: gravity,
    position: positionX,
    className: "cincout-notification",
    stopOnFocus: true,
    close: false,
    escapeMarkup: false,
    style: {
      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
      background: backgroundColor,
      ...positionStyle,
    },
    offset: { x: 0, y: 0 },
  }).showToast();
}
