// Utility functions
import html2canvas from "html2canvas";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import CodeMirror from "codemirror";

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

/**
 * Take a code snapshot of the code editor
 * @returns {Promise<void>}
 */
export const takeCodeSnap = async (): Promise<void> => {
  // Get the CodeMirror editor element
  const editorElement = document.querySelector(".CodeMirror");

  if (!editorElement) {
    showNotification("error", "CodeMirror editor element not found");
    return;
  }

  try {
    // Show loading notification
    const loadingToast = Toastify({
      text: '<i class="fas fa-spinner fa-spin"></i> Generating code snapshot...',
      duration: -1, // Stay until manually dismissed
      gravity: "top" as const,
      position: "right" as const,
      className: "codesnap-loading",
      style: {
        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
        padding: "10px",
        borderRadius: "5px",
        background: "rgba(0,0,0,0.7)",
      },
      escapeMarkup: false,
      stopOnFocus: true,
    });

    loadingToast.showToast();

    // Get the CodeMirror instance
    const cm = (editorElement as any).CodeMirror;
    if (!cm) {
      throw new Error("CodeMirror instance not found");
    }

    // Get code content and language
    const fullContent = cm.getValue();
    const lang =
      (document.getElementById("language") as HTMLSelectElement)?.value ||
      "code";

    // Create filename with timestamp
    const timestamp = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")} at ${String(
        now.getHours()
      ).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}.${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
    })();
    const filename = `${lang}-${timestamp}.png`;

    // Get current theme directly from theme selector
    const currentTheme =
      (document.getElementById("theme-select") as HTMLSelectElement)?.value ||
      "default";

    // Calculate width based on longest line
    const lines = fullContent.split("\n");
    const longestLine = lines.reduce(
      (longest: string, line: string) =>
        line.length > longest.length ? line : longest,
      ""
    );

    // Measure line width
    const measureEl = document.createElement("div");
    measureEl.style.cssText =
      "position: absolute; left: -9999px; visibility: hidden; white-space: pre;";
    const view = document.defaultView || window;
    measureEl.style.fontFamily =
      view.getComputedStyle(editorElement).fontFamily;
    measureEl.style.fontSize = view.getComputedStyle(editorElement).fontSize;
    measureEl.textContent = longestLine;
    document.body.appendChild(measureEl);
    const longestLineWidth = measureEl.clientWidth;
    document.body.removeChild(measureEl);

    // Calculate total width including line numbers
    const lineNumbersWidth =
      editorElement.querySelector(".CodeMirror-linenumbers")?.clientWidth || 0;
    const totalWidth = longestLineWidth + lineNumbersWidth + 40;

    // Create temporary container for new editor
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `position: absolute; left: -9999px; top: -9999px; opacity: 1; width: ${totalWidth}px;`;
    document.body.appendChild(tempContainer);

    // Get original editor styling
    const computedStyle = view.getComputedStyle(editorElement);
    const editorStyles = {
      fontFamily: computedStyle.getPropertyValue("font-family"),
      fontSize: computedStyle.getPropertyValue("font-size"),
      lineHeight: computedStyle.getPropertyValue("line-height"),
    };

    // Copy editor options that matter for rendering
    const currentOptions = {};
    const relevantOptions = [
      "mode",
      "lineWrapping",
      "lineNumbers",
      "foldGutter",
      "theme",
      "indentUnit",
      "indentWithTabs",
      "smartIndent",
    ];

    for (const option of relevantOptions) {
      try {
        const value = cm.getOption(option);
        if (value !== undefined) {
          (currentOptions as any)[option] = value;
        }
      } catch (e) {
        console.warn(`Couldn't get option ${option}:`, e);
      }
    }

    // Create new CodeMirror instance for snapshot
    const newCm = CodeMirror(tempContainer, {
      ...currentOptions,
      value: fullContent,
      readOnly: true,
      viewportMargin: Infinity,
      theme: currentTheme !== "default" ? currentTheme : "default",
    });

    // Wait for theme CSS to load and apply
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Style the new editor element
    const newEditorElement = tempContainer.querySelector(
      ".CodeMirror"
    ) as HTMLElement;
    if (!newEditorElement) {
      throw new Error("New editor element not found");
    }

    // Apply necessary styling
    newEditorElement.style.fontFamily = editorStyles.fontFamily;
    newEditorElement.style.fontSize = editorStyles.fontSize;
    newEditorElement.style.lineHeight = editorStyles.lineHeight;
    newEditorElement.style.width = `${totalWidth}px`;

    // Make content fully visible without scrolling
    const scrollElement = newEditorElement.querySelector(
      ".CodeMirror-scroll"
    ) as HTMLElement;
    if (scrollElement) {
      scrollElement.style.height = "auto";
      scrollElement.style.maxHeight = "none";
      scrollElement.style.overflow = "visible";
      scrollElement.style.width = `${totalWidth}px`;
    }

    const sizerElement = newEditorElement.querySelector(
      ".CodeMirror-sizer"
    ) as HTMLElement;
    if (sizerElement) {
      sizerElement.style.marginBottom = "0";
      sizerElement.style.minWidth = `${totalWidth - lineNumbersWidth}px`;
    }

    const codeArea = newEditorElement.querySelector(
      ".CodeMirror-lines"
    ) as HTMLElement;
    if (codeArea) {
      codeArea.style.width = `${totalWidth - lineNumbersWidth}px`;
    }

    // Force refresh and wait for it to complete
    newCm.refresh();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Take screenshot
    const canvas = await html2canvas(newEditorElement, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      height: newEditorElement.scrollHeight,
      width: totalWidth,
      windowHeight: newEditorElement.scrollHeight + 100,
    });

    // Convert to blob and download
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) {
      throw new Error("Failed to create blob from canvas");
    }

    // Download the image
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Clean up
    document.body.removeChild(tempContainer);
    loadingToast.hideToast();

    // Show success notification
    showNotification("success", "Code snapshot saved!");
  } catch (error) {
    console.error("CodeSnap error:", error);

    // Make sure loading indicator is removed in case of error
    const loadingToasts = document.querySelectorAll(
      ".toastify.codesnap-loading"
    );
    loadingToasts.forEach((toast) => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });

    // Show error notification
    showNotification("error", "Failed to create code snapshot");
  }
};
