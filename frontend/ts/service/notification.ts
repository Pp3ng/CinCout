import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

/**
 * Display a notification message with type and customizable position.
 * @param {"success"|"error"|"warning"|"info"} type - Notification type.
 * @param {string} message - Message to display.
 * @param {number} [duration=3000] - Duration to show notification in ms.
 * @param {{top?: string, right?: string, bottom?: string, left?: string}} [position] - Notification position.
 */
export const showNotification = (
  type: "success" | "error" | "warning" | "info",
  message: string,
  duration = 3000,
  position: { top?: string; right?: string; bottom?: string; left?: string } = {
    top: "20px",
    right: "20px",
  }
): void => {
  const styles = {
    success: { bg: "rgba(40,167,69,0.9)", icon: "fa-check-circle" },
    error: { bg: "rgba(220,53,69,0.9)", icon: "fa-exclamation-circle" },
    warning: { bg: "rgba(255,193,7,0.9)", icon: "fa-exclamation-triangle" },
    info: { bg: "rgba(23,162,184,0.9)", icon: "fa-info-circle" },
  }[type];
  const html = `<i class=\"fas ${styles.icon}\"></i> ${message}`;
  const isCenter = position.top === "50%" && position.left === "50%";
  isCenter
    ? centeredNotification(html, styles.bg, duration)
    : toastNotification(html, styles.bg, duration, position);
};

/**
 * Show a centered notification overlay.
 * @param {string} message - HTML message with icon.
 * @param {string} background - Background color.
 * @param {number} duration - Duration in ms.
 */
const centeredNotification = (
  message: string,
  background: string,
  duration: number
) => {
  const el = document.createElement("div");
  el.className = "cincout-notification";
  el.innerHTML = message;
  Object.assign(el.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background,
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    zIndex: "9999",
    fontFamily: "var(--font-mono)",
    boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
    fontSize: "16px",
    textAlign: "center",
    maxWidth: "80%",
    transition: "opacity 0.5s ease",
    opacity: "0",
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => (el.style.opacity = "1"));
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 500);
  }, duration);
};

/**
 * Show a Toastify notification.
 * @param {string} message - HTML message with icon.
 * @param {string} background - Background color.
 * @param {number} duration - Duration in ms.
 * @param {{top?: string, right?: string, bottom?: string, left?: string}} position - Notification position.
 */
const toastNotification = (
  message: string,
  background: string,
  duration: number,
  position: { top?: string; right?: string; bottom?: string; left?: string }
) => {
  const gravity = position.bottom ? "bottom" : "top";
  const positionX = position.left ? "left" : "right";
  Toastify({
    text: message,
    duration,
    gravity,
    position: positionX,
    className: "cincout-notification",
    stopOnFocus: true,
    close: false,
    escapeMarkup: false,
    style: {
      fontFamily: "var(--font-mono)",
      background,
      ...position,
    },
    offset: { x: 0, y: 0 },
  }).showToast();
};
