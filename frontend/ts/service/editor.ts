import CodeMirror from "codemirror";
import { EditorInstances } from "../types";
import themeManager from "../ui/themeManager";

// Default editor settings
const DEFAULT_FONT_SIZE = 14;
const FONT_SIZE_LIMITS = {
  MIN: 10,
  MAX: 30,
};

export class EditorService {
  private static instance: EditorService;
  private editor: CodeMirror.Editor | null = null;
  private assemblyView: CodeMirror.Editor | null = null;
  private straceView: CodeMirror.Editor | null = null;
  private currentFontSize: number = DEFAULT_FONT_SIZE;
  private editors: CodeMirror.Editor[] = [];

  private constructor() {
    // Subscribe to theme changes
    themeManager.subscribe(({ themeName }) => {
      this.applyThemeToAllEditors(themeName);
    });
  }

  static getInstance(): EditorService {
    if (!EditorService.instance) {
      EditorService.instance = new EditorService();
    }
    return EditorService.instance;
  }

  // Init
  setEditors(editors: EditorInstances): void {
    const { editor, assemblyView, straceView } = editors;
    this.editor = editor;
    this.assemblyView = assemblyView;
    this.straceView = straceView;

    // Store non-null editors in array for bulk operations
    this.editors = [editor, assemblyView, straceView].filter(
      Boolean
    ) as CodeMirror.Editor[];
  }

  // Editor instance getters
  getEditor = (): CodeMirror.Editor | null => this.editor;
  getAssemblyView = (): CodeMirror.Editor | null => this.assemblyView;
  getStraceView = (): CodeMirror.Editor | null => this.straceView;

  // Create a read-only editor for displaying output
  createReadOnlyEditor(): CodeMirror.Editor {
    const themeName = themeManager.getCurrentThemeName();
    const theme = themeName !== "default" ? themeName : "default";

    // Create editor instance
    this.straceView = CodeMirror(document.createElement("div"), {
      lineNumbers: true,
      mode: "text/x-csrc", // C-like syntax highlighting for strace
      readOnly: true,
      lineWrapping: true,
      theme,
    });

    // Apply current font size
    if (this.currentFontSize) {
      this.straceView.getWrapperElement().style.fontSize = `${this.currentFontSize}px`;
    }

    // Add to editors array if not already present
    if (!this.editors.includes(this.straceView)) {
      this.editors.push(this.straceView);
    }

    return this.straceView;
  }

  // Editor content methods
  getValue = (): string => this.editor?.getValue() ?? "";
  setValue = (value: string): void => this.editor?.setValue(value);

  // Editor cursor and scroll methods
  getCursor = (): CodeMirror.Position | null =>
    this.editor?.getCursor() ?? null;
  setCursor = (cursor: CodeMirror.Position): void =>
    this.editor?.setCursor(cursor);
  getScrollInfo = (): CodeMirror.ScrollInfo | null =>
    this.editor?.getScrollInfo() ?? null;
  scrollTo = (left: number, top: number): void =>
    this.editor?.scrollTo(left, top);

  // Refresh editor display
  refresh = (): void => this.editor?.refresh();

  // Set editor options
  setOption<K extends keyof CodeMirror.EditorConfiguration>(
    key: K,
    value: CodeMirror.EditorConfiguration[K]
  ): void {
    this.editor?.setOption(key, value);
  }

  // Set options for all editors
  setOptionForAll<K extends keyof CodeMirror.EditorConfiguration>(
    key: K,
    value: CodeMirror.EditorConfiguration[K]
  ): void {
    this.forEachEditor((editor) => editor.setOption(key, value));
  }

  // Set content for specialized views
  setAssemblyValue = (value: string): void =>
    this.assemblyView?.setValue(value);
  setStraceValue = (value: string): void => this.straceView?.setValue(value);

  // Apply theme to all editors
  applyThemeToAllEditors(themeName: string): void {
    const theme = themeName !== "default" ? themeName : "default";
    this.setOptionForAll("theme", theme);
  }

  setFontSize(size: number): void {
    this.currentFontSize = size;
    this.forEachEditor((editor) => {
      editor.getWrapperElement().style.fontSize = `${size}px`;
    });
    this.refreshAllEditors();
  }

  refreshAllEditors(): void {
    this.forEachEditor((editor) => editor.refresh());
  }

  // Apply a operation to each editor instance
  private forEachEditor(callback: (editor: CodeMirror.Editor) => void): void {
    this.editors.forEach(callback);
  }
}

const setupEditors = (): EditorInstances => {
  const codeElement = document.getElementById("code") as HTMLTextAreaElement;
  const outputElement = document.getElementById("output") as HTMLDivElement;

  if (!codeElement || !outputElement) {
    throw new Error("Required DOM elements not found");
  }

  // Get current theme
  const themeName = themeManager.getCurrentThemeName();
  const theme = themeName !== "default" ? themeName : "default";

  // Create main code editor
  const editor = CodeMirror.fromTextArea(codeElement, {
    lineNumbers: true,
    mode: "text/x-c++src",
    keyMap: "default",
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: true,
    lineWrapping: true,
    styleActiveLine: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    foldOptions: { widget: "..." },
    theme,
  });

  // Set up Vim mode change listener
  (editor as any).on("vim-mode-change", (data: { mode: string }) => {
    const vimStatusElement = document.getElementById("vim-status");
    if (vimStatusElement) {
      vimStatusElement.textContent = `-- ${data.mode.toUpperCase()} --`;

      // Only show vim status when vim mode is active
      const keyMap = editor.getOption("keyMap");
      vimStatusElement.style.display = keyMap?.startsWith("vim")
        ? "block"
        : "none";
    }
  });

  // Create assembly view (detached)
  const assemblyView = CodeMirror(document.createElement("div"), {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true,
    theme,
  });

  // Create strace view
  const straceView = CodeMirror(document.createElement("div"), {
    lineNumbers: true,
    mode: "text/x-csrc", // C-like syntax highlighting for strace
    readOnly: true,
    lineWrapping: true,
    theme,
  });

  return { editor, assemblyView, straceView };
};

const setupFontZoomHandler = () => {
  const editorService = EditorService.getInstance();
  let fontSize = DEFAULT_FONT_SIZE;
  editorService.setFontSize(fontSize);

  // Handle font zooming with ctrl+wheel
  document.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();

        // Adjust font size based on scroll direction
        fontSize =
          e.deltaY < 0
            ? Math.min(fontSize + 1, FONT_SIZE_LIMITS.MAX)
            : Math.max(fontSize - 1, FONT_SIZE_LIMITS.MIN);

        editorService.setFontSize(fontSize);
      }
    },
    { passive: false }
  );
};

// External editor actions interface
export interface EditorActions {
  toggleZenMode: () => void;
}

// Global actions state
let globalActions: EditorActions | null = null;

// Action management functions
export const setEditorActions = (actions: EditorActions): void => {
  globalActions = actions;
};
export const getEditorActions = (): EditorActions | null => globalActions;
export const getEditorService = (): EditorService =>
  EditorService.getInstance();

// Initialize Vim status UI
const initializeVimStatus = (editor: CodeMirror.Editor): void => {
  const vimStatusElement = document.getElementById("vim-status");
  if (!vimStatusElement) return;

  const keyMap = editor.getOption("keyMap");
  const isVimEnabled = keyMap?.startsWith("vim");

  vimStatusElement.style.display = isVimEnabled ? "block" : "none";
  if (isVimEnabled) {
    vimStatusElement.textContent = "-- NORMAL --"; // Default initial mode
  }
};

// Initialize all editors and related services
export const initEditors = (): void => {
  try {
    // Create editor instances
    const editorInstances = setupEditors();

    // Initialize the editor service
    const editorService = EditorService.getInstance();
    editorService.setEditors(editorInstances);

    // Setup additional features
    setupFontZoomHandler();
    initializeVimStatus(editorInstances.editor);
  } catch (e) {
    console.error("Editor setup failed:", e);
  }
};
