// Utility functions
import html2canvas from "html2canvas";

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
  // Define notification configuration by type
  const config = {
    success: { icon: "fa-check-circle", color: "rgba(40,167,69,0.9)" },
    error: { icon: "fa-exclamation-circle", color: "rgba(220,53,69,0.9)" },
    warning: { icon: "fa-exclamation-triangle", color: "rgba(255,193,7,0.9)" },
    info: { icon: "fa-info-circle", color: "rgba(23,162,184,0.9)" },
  };

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "cincout-notification";
  notification.innerHTML = `<i class="fas ${config[type].icon}"></i> ${message}`;

  // Handle positioning
  const isCentered = position.top === "50%" && position.left === "50%";

  // Build position CSS
  const positionCSS =
    Object.entries(position)
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ") + (isCentered ? " transform: translate(-50%, -50%);" : "");

  // Apply styling
  notification.style.cssText = `position: ${
    isCentered ? "absolute" : "fixed"
  }; ${positionCSS} 
    background: ${
      config[type].color
    }; color: white; padding: 10px; border-radius: 5px; 
    z-index: 9999; transition: opacity 0.5s ease; font-family: 'Fira Code', 'JetBrains Mono', monospace;`;

  // Append to appropriate container
  const container = isCentered
    ? document.querySelector(".editor-panel") || document.body
    : document.body;

  container.appendChild(notification);

  // Auto-remove after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.parentNode?.removeChild(notification), 500);
  }, duration);
};

/**
 * Take a code snapshot of the code editor
 * @returns {Promise<void>}
 */
export const takeCodeSnap = async (): Promise<void> => {
  const editorElement = document.querySelector(".CodeMirror");
  if (!editorElement) {
    showNotification("error", "CodeMirror editor element not found");
    return;
  }

  // Create and show loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "codesnap-loading";
  loadingIndicator.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Generating code snapshot...';
  loadingIndicator.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; z-index: 9999; font-family: 'Fira Code', monospace;";
  document.body.appendChild(loadingIndicator);

  try {
    // Get the CodeMirror instance and content
    const cm = (editorElement as any).CodeMirror;
    if (!cm) throw new Error("CodeMirror instance not found");

    const fullContent = cm.getValue();
    const lang =
      (document.getElementById("language") as HTMLSelectElement)?.value ||
      "code";
    const currentTheme =
      (document.getElementById("theme-select") as HTMLSelectElement)?.value ||
      "default";

    // Generate timestamp for filename
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "at",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ]
      .join("-")
      .replace(/-at-/g, " at ")
      .replace(/-/g, ".");

    const filename = `${lang}-${timestamp}.png`;

    // Calculate editor width based on content
    const measureWidth = (text: string): number => {
      const measureEl = document.createElement("div");
      measureEl.style.cssText =
        "position: absolute; left: -9999px; visibility: hidden; white-space: pre;";
      measureEl.style.fontFamily =
        window.getComputedStyle(editorElement).fontFamily;
      measureEl.style.fontSize =
        window.getComputedStyle(editorElement).fontSize;
      measureEl.textContent = text;
      document.body.appendChild(measureEl);
      const width = measureEl.clientWidth;
      document.body.removeChild(measureEl);
      return width;
    };

    // Find longest line and calculate total width
    const longestLine = fullContent
      .split("\n")
      .reduce(
        (longest, line) => (line.length > longest.length ? line : longest),
        ""
      );
    const lineNumbersWidth =
      editorElement.querySelector(".CodeMirror-linenumbers")?.clientWidth || 0;
    const totalWidth = measureWidth(longestLine) + lineNumbersWidth + 40;

    // Create temporary container for snapshot
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `position: absolute; left: -9999px; top: -9999px; opacity: 1; width: ${totalWidth}px;`;
    document.body.appendChild(tempContainer);

    // Copy editor styles
    const computedStyle = window.getComputedStyle(editorElement);
    const editorStyles = {
      fontFamily: computedStyle.getPropertyValue("font-family"),
      fontSize: computedStyle.getPropertyValue("font-size"),
      lineHeight: computedStyle.getPropertyValue("line-height"),
    };

    // Get relevant editor options
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
    const currentOptions = relevantOptions.reduce((options, option) => {
      try {
        const value = cm.getOption(option);
        if (value !== undefined) options[option] = value;
      } catch (e) {}
      return options;
    }, {} as Record<string, any>);

    // Create snapshot editor
    const newCm = (window as any).CodeMirror(tempContainer, {
      ...currentOptions,
      value: fullContent,
      readOnly: true,
      viewportMargin: Infinity,
      theme: currentTheme !== "default" ? currentTheme : "default",
    });

    // Wait for theme to apply
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Configure snapshot editor styling
    const newEditorElement = tempContainer.querySelector(
      ".CodeMirror"
    ) as HTMLElement;
    if (!newEditorElement) throw new Error("New editor element not found");

    // Apply styles
    Object.assign(newEditorElement.style, {
      ...editorStyles,
      width: `${totalWidth}px`,
    });

    // Configure scroll element
    const scrollElement = newEditorElement.querySelector(
      ".CodeMirror-scroll"
    ) as HTMLElement;
    if (scrollElement) {
      Object.assign(scrollElement.style, {
        height: "auto",
        maxHeight: "none",
        overflow: "visible",
        width: `${totalWidth}px`,
      });
    }

    // Configure sizer element
    const sizerElement = newEditorElement.querySelector(
      ".CodeMirror-sizer"
    ) as HTMLElement;
    if (sizerElement) {
      sizerElement.style.marginBottom = "0";
      sizerElement.style.minWidth = `${totalWidth - lineNumbersWidth}px`;
    }

    // Configure code area
    const codeArea = newEditorElement.querySelector(
      ".CodeMirror-lines"
    ) as HTMLElement;
    if (codeArea) {
      codeArea.style.width = `${totalWidth - lineNumbersWidth}px`;
    }

    // Refresh and take screenshot
    newCm.refresh();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate canvas and download image
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
    if (!blob) throw new Error("Failed to create blob from canvas");

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    // Clean up
    document.body.removeChild(tempContainer);
    showNotification("success", "Code snapshot saved!");
  } catch (error) {
    console.error("CodeSnap error:", error);
    showNotification("error", "Failed to create code snapshot");
  } finally {
    // Always remove the loading indicator
    document.body.querySelector(".codesnap-loading")?.remove();
  }
};
