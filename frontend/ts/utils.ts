// Utility functions
import html2canvas from "html2canvas";

// Debounce function to prevent rapid clicks
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };
};

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
  const notification = document.createElement("div");
  notification.className = "cincout-notification";

  // Set different styles and icons based on type
  let icon = "";
  let bgColor = "";

  switch (type) {
    case "success":
      icon = "fa-check-circle";
      bgColor = "rgba(40,167,69,0.9)";
      break;
    case "error":
      icon = "fa-exclamation-circle";
      bgColor = "rgba(220,53,69,0.9)";
      break;
    case "warning":
      icon = "fa-exclamation-triangle";
      bgColor = "rgba(255,193,7,0.9)";
      break;
    case "info":
    default:
      icon = "fa-info-circle";
      bgColor = "rgba(23,162,184,0.9)";
      break;
  }

  notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

  // Check if we're centering in the editor panel
  const isCentered = position.top === "50%" && position.left === "50%";

  // Build position CSS string
  let positionCSS = "position: fixed; ";
  if (position.top) positionCSS += `top: ${position.top}; `;
  if (position.right) positionCSS += `right: ${position.right}; `;
  if (position.bottom) positionCSS += `bottom: ${position.bottom}; `;
  if (position.left) positionCSS += `left: ${position.left}; `;

  // Add transform for centered positioning if needed
  if (isCentered) {
    positionCSS += "transform: translate(-50%, -50%); ";
  }

  notification.style.cssText = `${positionCSS} background: ${bgColor}; color: white; padding: 10px; border-radius: 5px; z-index: 9999; transition: opacity 0.5s ease;`;

  // For centered notifications, try to append to editor panel first
  if (isCentered) {
    const editorPanel = document.querySelector(".editor-panel");
    if (editorPanel) {
      // For editor panel centering, make the position relative to the editor panel
      notification.style.position = "absolute";
      editorPanel.appendChild(notification);
    } else {
      // Fallback to body if editor panel not found
      document.body.appendChild(notification);
    }
  } else {
    // Normal fixed positioning relative to viewport
    document.body.appendChild(notification);
  }

  // Notification disappears after a set time
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
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

  try {
    const loadingIndicator = createLoadingIndicator();
    document.body.appendChild(loadingIndicator);

    // Get the CodeMirror instance
    const cm = (editorElement as any).CodeMirror;
    if (!cm) {
      throw new Error("CodeMirror instance not found");
    }

    // Get code details and create filename
    const { fullContent, lang, filename } = getCodeDetails(cm);

    // Create and setup temporary editor for snapshot
    const { tempContainer, newEditorElement } = await createTemporaryEditor(
      editorElement,
      cm,
      fullContent
    );

    // Take the screenshot
    const blob = await takeScreenshot(newEditorElement);

    // Download the image
    downloadImage(blob, filename);

    // Clean up
    document.body.removeChild(tempContainer);
    document.body.removeChild(loadingIndicator);

    // Show success notification
    showNotification("success", "Code snapshot saved!");
  } catch (error) {
    console.error("CodeSnap error:", error);

    // Make sure loading indicator is removed in case of error
    const existingIndicator = document.querySelector(".codesnap-loading");
    if (existingIndicator && existingIndicator.parentNode) {
      existingIndicator.parentNode.removeChild(existingIndicator);
    }

    // Show error notification
    showNotification("error", "Failed to create code snapshot");
  }
};

/**
 * Create loading indicator for code snapshot process
 * @returns {HTMLDivElement} The loading indicator element
 */
const createLoadingIndicator = (): HTMLDivElement => {
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "codesnap-loading";
  loadingIndicator.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Generating code snapshot...';
  loadingIndicator.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; z-index: 9999;";
  return loadingIndicator;
};

/**
 * Extract content and metadata from the editor
 * @param {any} cm - CodeMirror instance
 * @returns {Object} Code details including content, language and filename
 */
const getCodeDetails = (
  cm: any
): { fullContent: string; lang: string; filename: string } => {
  // Get code content and language
  const fullContent = cm.getValue();
  const lang =
    (document.getElementById("language") as HTMLSelectElement)?.value || "code";

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

  return {
    fullContent,
    lang,
    filename: `${lang}-${timestamp}.png`,
  };
};

/**
 * Calculate the dimensions needed for the editor snapshot
 * @param {HTMLElement} editorElement - Original editor element
 * @param {string} fullContent - Current editor content
 * @returns {Object} Calculated dimensions
 */
const calculateEditorDimensions = (
  editorElement: HTMLElement,
  fullContent: string
): {
  longestLineWidth: number;
  lineNumbersWidth: number;
  totalWidth: number;
} => {
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
  measureEl.style.fontFamily =
    window.getComputedStyle(editorElement).fontFamily;
  measureEl.style.fontSize = window.getComputedStyle(editorElement).fontSize;
  measureEl.textContent = longestLine;
  document.body.appendChild(measureEl);
  const longestLineWidth = measureEl.clientWidth;
  document.body.removeChild(measureEl);

  // Calculate total width including line numbers
  const lineNumbersWidth =
    editorElement.querySelector(".CodeMirror-linenumbers")?.clientWidth || 0;
  const totalWidth = longestLineWidth + lineNumbersWidth + 40;

  return { longestLineWidth, lineNumbersWidth, totalWidth };
};

/**
 * Create a temporary CodeMirror editor for snapshot
 * @param {HTMLElement} editorElement - Original editor element
 * @param {any} cm - Original CodeMirror instance
 * @param {string} fullContent - Current editor content
 * @returns {Promise<Object>} Container and editor elements
 */
const createTemporaryEditor = async (
  editorElement: HTMLElement,
  cm: any,
  fullContent: string
): Promise<{ tempContainer: HTMLElement; newEditorElement: HTMLElement }> => {
  const { totalWidth, lineNumbersWidth } = calculateEditorDimensions(
    editorElement,
    fullContent
  );

  // Create temporary container for new editor
  const tempContainer = document.createElement("div");
  tempContainer.style.cssText = `position: absolute; left: -9999px; top: -9999px; opacity: 1; width: ${totalWidth}px;`;
  document.body.appendChild(tempContainer);

  // Get original editor styling
  const computedStyle = window.getComputedStyle(editorElement);
  const editorStyles = {
    fontFamily: computedStyle.getPropertyValue("font-family"),
    fontSize: computedStyle.getPropertyValue("font-size"),
    lineHeight: computedStyle.getPropertyValue("line-height"),
  };

  // Copy editor options that matter for rendering
  const currentOptions = copyEditorOptions(cm);

  // Get current theme
  const currentTheme =
    (document.getElementById("theme-select") as HTMLSelectElement)?.value ||
    "default";

  // Create new CodeMirror instance for snapshot
  const newCm = (window as any).CodeMirror(tempContainer, {
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

  // Apply styling
  styleTemporaryEditor(
    newEditorElement,
    editorStyles,
    totalWidth,
    lineNumbersWidth
  );

  // Force refresh and wait for it to complete
  newCm.refresh();
  await new Promise((resolve) => setTimeout(resolve, 300));

  return { tempContainer, newEditorElement };
};

/**
 * Copy options from original editor
 * @param {any} cm - Original CodeMirror instance
 * @returns {Object} Copied options
 */
const copyEditorOptions = (cm: any): Record<string, any> => {
  const currentOptions: Record<string, any> = {};
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
        currentOptions[option] = value;
      }
    } catch (e) {
      console.warn(`Couldn't get option ${option}:`, e);
    }
  }

  return currentOptions;
};

/**
 * Style the temporary editor for the snapshot
 * @param {HTMLElement} editorElement - Editor element to style
 * @param {Object} styles - Editor styles to apply
 * @param {number} totalWidth - Total width for editor
 * @param {number} lineNumbersWidth - Width of line numbers
 */
const styleTemporaryEditor = (
  editorElement: HTMLElement,
  styles: { fontFamily: string; fontSize: string; lineHeight: string },
  totalWidth: number,
  lineNumbersWidth: number
): void => {
  // Apply necessary styling
  editorElement.style.fontFamily = styles.fontFamily;
  editorElement.style.fontSize = styles.fontSize;
  editorElement.style.lineHeight = styles.lineHeight;
  editorElement.style.width = `${totalWidth}px`;

  // Make content fully visible without scrolling
  const scrollElement = editorElement.querySelector(
    ".CodeMirror-scroll"
  ) as HTMLElement;
  if (scrollElement) {
    scrollElement.style.height = "auto";
    scrollElement.style.maxHeight = "none";
    scrollElement.style.overflow = "visible";
    scrollElement.style.width = `${totalWidth}px`;
  }

  const sizerElement = editorElement.querySelector(
    ".CodeMirror-sizer"
  ) as HTMLElement;
  if (sizerElement) {
    sizerElement.style.marginBottom = "0";
    sizerElement.style.minWidth = `${totalWidth - lineNumbersWidth}px`;
  }

  const codeArea = editorElement.querySelector(
    ".CodeMirror-lines"
  ) as HTMLElement;
  if (codeArea) {
    codeArea.style.width = `${totalWidth - lineNumbersWidth}px`;
  }
};

/**
 * Take screenshot of the prepared editor
 * @param {HTMLElement} element - Element to take screenshot of
 * @returns {Promise<Blob>} Screenshot as a Blob
 */
const takeScreenshot = async (element: HTMLElement): Promise<Blob> => {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
    height: element.scrollHeight,
    width: parseInt(element.style.width || "0"),
    windowHeight: element.scrollHeight + 100,
  });

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (!blob) {
    throw new Error("Failed to create blob from canvas");
  }

  return blob;
};

/**
 * Download the image
 * @param {Blob} blob - Image blob
 * @param {string} filename - Name for the download file
 */
const downloadImage = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Detect operating system based on userAgent
 * @returns {string} - The detected OS: 'MacOS' or 'Other'
 */
export const detectOS = (): string => {
  const userAgent = window.navigator.userAgent;
  return /Mac/.test(userAgent) ? "MacOS" : "Other";
};

/**
 * Triggers a click event on an element with the specified ID
 * @param {string} id - The ID of the element to click
 */
export const triggerButton = (id: string): void => {
  const element = document.getElementById(id);
  if (element) element.click();
};

/**
 * Saves the current code to a file
 */
export const saveCodeToFile = (): void => {
  const editor = (window as any).editor;
  const code = editor.getValue();
  const fileType =
    (document.getElementById("language") as HTMLSelectElement).value === "cpp"
      ? "cpp"
      : "c";
  const blob = new Blob([code], { type: "text/plain" });
  const downloadLink = document.createElement("a");

  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `code.${fileType}`;
  downloadLink.click();
};

/**
 * Opens code from a file
 */
export const openCodeFromFile = (): void => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".c,.cpp";

  fileInput.onchange = function (this: HTMLInputElement) {
    const selectedFile = this.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = function () {
      if ((window as any).editor) {
        (window as any).editor.setValue(reader.result as string);
      }
    };
    reader.readAsText(selectedFile);
  };

  fileInput.click();
};

/**
 * Toggles code folding at the cursor position
 */
export const toggleCodeFolding = (): void => {
  if ((window as any).editor) {
    (window as any).editor.foldCode((window as any).editor.getCursor());
  }
};

/**
 * Normalizes a keyboard event into a format usable for shortcut lookup
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {string} - Normalized key representation
 */
export const normalizeKeyCombo = (event: KeyboardEvent): string => {
  const key = event.key.toLowerCase();

  // Handle special keys
  if (key === "enter") return "Enter";
  if (key === "escape") return "Escape";

  // Build key combination prefix
  let prefix = "";
  if (event.ctrlKey) prefix += "ctrl+";
  if (event.altKey) prefix += "alt+";
  if (event.metaKey) prefix += "meta+";
  if (event.shiftKey) prefix += "shift+";

  // Handle letter and number keys
  if (prefix) {
    // Use lowercase for letter keys
    if (key.length === 1) return prefix + key;

    // Single number keys
    if (/^[0-9]$/.test(key)) return prefix + key;
  }

  // For keys without modifiers, return as is
  return event.key;
};

// Add these declarations to make them globally available
declare global {
  interface Window {
    html2canvas: any;
    CodeMirror: any;
    editor: any;
    assemblyView: any;
    fitAddon: any;
    terminal: any;
    templates: any;
    templateLists: Record<string, string[]>;
    loadedTemplates: Set<string>;
    updateTemplates: () => Promise<void>;
    setTemplate: () => Promise<void>;
    CinCoutSocket: any;
  }
}
