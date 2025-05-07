/**
 * CodeSnapService.ts
 * Handles code screenshot functionality
 */
import html2canvas from "html2canvas";
import { EditorService } from "./EditorService";

/**
 * Code Snapshot Service - Provides code editor screenshot functionality
 */
class CodeSnapService {
  /**
   * Create a screenshot of the code editor
   * @returns {Promise<void>}
   */
  async takeSnapshot(): Promise<void> {
    const editorElement = document.querySelector(".CodeMirror");

    // Create and display loading indicator
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "codesnap-loading";
    loadingIndicator.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Generating code screenshot...';
    loadingIndicator.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; z-index: 9999; font-family: 'Fira Code', monospace;";
    document.body.appendChild(loadingIndicator);

    try {
      // Get CodeMirror instance and content
      const cm = (editorElement as any).CodeMirror;
      if (!cm) throw new Error("CodeMirror instance not found");

      const fullContent = cm.getValue();

      // Get language and theme configuration from EditorService
      const editorConfig = EditorService.getConfig();
      const lang = editorConfig.language;

      // Get current theme
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
        editorElement.querySelector(".CodeMirror-linenumbers")?.clientWidth ||
        0;
      const totalWidth = measureWidth(longestLine) + lineNumbersWidth + 40;

      // Create temporary container for screenshot
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

      // Create screenshot editor
      const newCm = (window as any).CodeMirror(tempContainer, {
        ...currentOptions,
        value: fullContent,
        readOnly: true,
        viewportMargin: Infinity,
        theme: currentTheme !== "default" ? currentTheme : "default",
      });

      // Wait for theme to apply
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Configure screenshot editor style
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

      // Refresh and capture screenshot
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
      if (!blob) throw new Error("Unable to create blob from canvas");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      // Cleanup
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error("CodeSnap error:", error);
    } finally {
      // Always remove loading indicator
      document.body.querySelector(".codesnap-loading")?.remove();
    }
  }
}

// Create singleton instance
export const codeSnapService = new CodeSnapService();
