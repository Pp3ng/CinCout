import html2canvas from "html2canvas";
import CodeMirror from "codemirror";
import Toastify from "toastify-js";
import { showNotification } from "./notification";

const getEditorStyle = (editor: Element) => {
  const style = getComputedStyle(editor);
  return {
    fontFamily: style.getPropertyValue("font-family"),
    fontSize: style.getPropertyValue("font-size"),
    lineHeight: style.getPropertyValue("line-height"),
  };
};

const getLongestLineWidth = (lines: string[], style: any): number => {
  const measureEl = document.createElement("div");
  measureEl.style.cssText =
    "position:absolute;left:-9999px;visibility:hidden;white-space:pre;";
  measureEl.style.fontFamily = style.fontFamily;
  measureEl.style.fontSize = style.fontSize;
  measureEl.textContent = lines.reduce(
    (a, b) => (b.length > a.length ? b : a),
    ""
  );
  document.body.appendChild(measureEl);
  const width = measureEl.clientWidth;
  document.body.removeChild(measureEl);
  return width;
};

export const takeCodeSnap = async (): Promise<void> => {
  const editorElement = document.querySelector(".CodeMirror");
  if (!editorElement)
    return showNotification("error", "CodeMirror editor element not found");

  let loadingToast: any;
  try {
    loadingToast = Toastify({
      text: '<i class="fas fa-spinner fa-spin"></i> Generating code snapshot...',
      duration: -1,
      gravity: "top",
      position: "right",
      className: "codesnap-loading",
      style: {
        fontFamily: "var(--font-mono)",
        padding: "10px",
        borderRadius: "5px",
        background: "rgba(0,0,0,0.7)",
      },
      escapeMarkup: false,
      stopOnFocus: true,
    });
    loadingToast.showToast();

    const cm = (editorElement as any).CodeMirror;
    if (!cm) throw new Error("CodeMirror instance not found");
    const fullContent = cm.getValue();
    const lang =
      (document.getElementById("language") as HTMLSelectElement)?.value ||
      "code";
    const now = new Date();
    const filename = `${lang}-${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} at ${String(
      now.getHours()
    ).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}.${String(
      now.getSeconds()
    ).padStart(2, "0")}.png`;
    const currentTheme =
      (document.getElementById("theme-select") as HTMLSelectElement)?.value ||
      "default";

    const lines = fullContent.split("\n");
    const style = getEditorStyle(editorElement);
    const longestLineWidth = getLongestLineWidth(lines, style);
    const lineNumbersWidth =
      (editorElement.querySelector(".CodeMirror-linenumbers") as HTMLElement)
        ?.clientWidth || 0;
    const totalWidth = longestLineWidth + lineNumbersWidth + 40;

    // Create a tempoary container for the new CodeMirror instance
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:${totalWidth}px;`;
    document.body.appendChild(tempContainer);

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
    const currentOptions: Record<string, any> = {};
    relevantOptions.forEach((opt) => (currentOptions[opt] = cm.getOption(opt)));
    const newCm = CodeMirror(tempContainer, {
      ...currentOptions,
      value: fullContent,
      readOnly: true,
      viewportMargin: Infinity,
      theme: currentTheme,
    });

    await new Promise((r) => setTimeout(r, 400));
    const newEditor = tempContainer.querySelector(".CodeMirror") as HTMLElement;
    if (!newEditor) throw new Error("New editor element not found");

    Object.assign(newEditor.style, style, { width: `${totalWidth}px` });
    const scroll = newEditor.querySelector(".CodeMirror-scroll") as HTMLElement;
    if (scroll)
      Object.assign(scroll.style, {
        height: "auto",
        maxHeight: "none",
        overflow: "visible",
        width: `${totalWidth}px`,
      });
    const sizer = newEditor.querySelector(".CodeMirror-sizer") as HTMLElement;
    if (sizer) sizer.style.minWidth = `${totalWidth - lineNumbersWidth}px`;
    const codeArea = newEditor.querySelector(
      ".CodeMirror-lines"
    ) as HTMLElement;
    if (codeArea) codeArea.style.width = `${totalWidth - lineNumbersWidth}px`;

    // Force refresh and wait for it complete
    newCm.refresh();
    await new Promise((r) => setTimeout(r, 200));

    // Take snapshot
    const canvas = await html2canvas(newEditor, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      height: newEditor.scrollHeight,
      width: totalWidth,
      windowHeight: newEditor.scrollHeight + 100,
    });

    // Convert blob and download
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png")
    );
    if (!blob) throw new Error("Failed to create blob from canvas");
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
    showNotification("success", "Code snapshot saved!");
  } catch (error) {
    if (loadingToast) loadingToast.hideToast();
    showNotification("error", "Failed to create code snapshot");
  }
};
