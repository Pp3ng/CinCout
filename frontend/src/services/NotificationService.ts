/**
 * NotificationService.ts
 * Handles notification display throughout the application
 */

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationPosition {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface NotificationConfig {
  icon: string;
  color: string;
}

/**
 * Notification Service Class - Manages all application notifications
 */
class NotificationService {
  // Notification type configurations
  private config: Record<NotificationType, NotificationConfig> = {
    success: { icon: "fa-check-circle", color: "rgba(40,167,69,0.9)" },
    error: { icon: "fa-exclamation-circle", color: "rgba(220,53,69,0.9)" },
    warning: { icon: "fa-exclamation-triangle", color: "rgba(255,193,7,0.9)" },
    info: { icon: "fa-info-circle", color: "rgba(23,162,184,0.9)" },
  };

  // Default display position
  private defaultPosition: NotificationPosition = {
    top: "20px",
    right: "20px",
  };

  // Default display duration
  private defaultDuration = 3000;

  /**
   * Show notification
   * @param type Notification type: 'success', 'error', 'warning', 'info'
   * @param message Notification message content
   * @param duration Display duration in milliseconds, default 3000ms
   * @param position Display position, default top-right corner
   */
  show(
    type: NotificationType,
    message: string,
    duration: number = this.defaultDuration,
    position: NotificationPosition = this.defaultPosition
  ): void {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "cincout-notification";
    notification.innerHTML = `<i class="fas ${this.config[type].icon}"></i> ${message}`;

    // Check if centered display
    const isCentered = position.top === "50%" && position.left === "50%";

    // Build position CSS
    const positionCSS =
      Object.entries(position)
        .map(([key, value]) => `${key}: ${value};`)
        .join(" ") + (isCentered ? " transform: translate(-50%, -50%);" : "");

    // Apply styles
    notification.style.cssText = `position: ${
      isCentered ? "absolute" : "fixed"
    }; ${positionCSS} 
      background: ${
        this.config[type].color
      }; color: white; padding: 10px; border-radius: 5px; 
      z-index: 9999; transition: opacity 0.5s ease; font-family: 'Fira Code', 'JetBrains Mono', monospace;`;

    // Add to appropriate container
    const container = isCentered
      ? document.querySelector(".editor-panel") || document.body
      : document.body;

    container.appendChild(notification);

    // Set auto-removal
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.parentNode?.removeChild(notification), 500);
    }, duration);
  }
  success(
    message: string,
    duration?: number,
    position?: NotificationPosition
  ): void {
    this.show("success", message, duration, position);
  }

  error(
    message: string,
    duration?: number,
    position?: NotificationPosition
  ): void {
    this.show("error", message, duration, position);
  }

  warning(
    message: string,
    duration?: number,
    position?: NotificationPosition
  ): void {
    this.show("warning", message, duration, position);
  }

  info(
    message: string,
    duration?: number,
    position?: NotificationPosition
  ): void {
    this.show("info", message, duration, position);
  }
}

// Create singleton instance
export const notificationService = new NotificationService();
