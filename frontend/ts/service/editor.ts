import CodeMirror from "codemirror";
import "codemirror/mode/clike/clike";
import "codemirror/mode/gas/gas";
import "codemirror/keymap/vim";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/selection/active-line.js";
import { debounce } from "lodash-es";
import { EditorInstances } from "../types";
import themeManager from "../ui/themeManager";

const EDITOR_CONFIG = {
  DEFAULT_FONT_SIZE: 14 as const,
  FONT_SIZE_LIMITS: {
    MIN: 10 as const,
    MAX: 30 as const,
  },
  DEFAULT_THEME: "default" as const,
  VIM_STATUS: {
    NORMAL: "-- NORMAL --" as const,
    UPPER: (mode: string) => `-- ${mode.toUpperCase()} --` as const,
  },
} as const;

export class EditorService {
  private static instance: EditorService;

  private editor: CodeMirror.Editor | null = null;
  private assemblyView: CodeMirror.Editor | null = null;
  private straceView: CodeMirror.Editor | null = null;

  private currentFontSize: number = 14;
  private readonly activeEditors = new Set<CodeMirror.Editor>();
  private readonly debouncedRefresh = debounce(
    () => this.refreshAllEditors(),
    300
  );

  private constructor() {
    // Subscribe to theme changes
    themeManager.subscribe(({ themeName }) => {
      this.applyThemeToAllEditors(themeName);
    });
  }

  static getInstance(): EditorService {
    return (EditorService.instance ??= new EditorService());
  }

  readonly setEditors = ({
    editor,
    assemblyView,
    straceView,
  }: EditorInstances): void => {
    this.editor = editor;
    this.assemblyView = assemblyView;
    this.straceView = straceView;

    this.activeEditors.clear();
    [editor, assemblyView, straceView]
      .filter((ed): ed is CodeMirror.Editor => Boolean(ed))
      .forEach((ed) => this.activeEditors.add(ed));
  };

  // Editor instance getters
  readonly getEditor = (): CodeMirror.Editor | null => this.editor;
  readonly getAssemblyView = (): CodeMirror.Editor | null => this.assemblyView;
  readonly getStraceView = (): CodeMirror.Editor | null => this.straceView;

  // Create a read-only editor
  readonly createReadOnlyEditor = (): CodeMirror.Editor => {
    const themeName = themeManager.getCurrentThemeName();
    const theme =
      themeName !== EDITOR_CONFIG.DEFAULT_THEME
        ? themeName
        : EDITOR_CONFIG.DEFAULT_THEME;

    // Create editor instance
    this.straceView = CodeMirror(document.createElement("div"), {
      lineNumbers: true,
      mode: "text/x-csrc",
      readOnly: true,
      lineWrapping: true,
      theme,
    });

    // Apply current font size
    if (this.currentFontSize) {
      this.straceView.getWrapperElement().style.fontSize = `${this.currentFontSize}px`;
    }

    // Add to active editors set
    this.activeEditors.add(this.straceView);

    return this.straceView;
  };

  // Editor value methods
  readonly getValue = (): string => this.editor?.getValue() ?? "";
  readonly setValue = (value: string): void => this.editor?.setValue(value);

  // Editor cursor and scroll methods
  readonly getCursor = (): CodeMirror.Position | null =>
    this.editor?.getCursor() ?? null;
  readonly setCursor = (cursor: CodeMirror.Position): void =>
    this.editor?.setCursor(cursor);
  readonly getScrollInfo = (): CodeMirror.ScrollInfo | null =>
    this.editor?.getScrollInfo() ?? null;
  readonly scrollTo = (left: number, top: number): void =>
    this.editor?.scrollTo(left, top);

  // Refresh editor display
  readonly refresh = (): void => this.editor?.refresh();

  // Set editor options
  readonly setOption = <K extends keyof CodeMirror.EditorConfiguration>(
    key: K,
    value: CodeMirror.EditorConfiguration[K]
  ): void => {
    this.editor?.setOption(key, value);
  };

  // Set options for all editors
  readonly setOptionForAll = <K extends keyof CodeMirror.EditorConfiguration>(
    key: K,
    value: CodeMirror.EditorConfiguration[K]
  ): void => {
    this.forEachEditor((editor) => editor.setOption(key, value));
  };

  // Set assembly and strace view values
  readonly setAssemblyValue = (value: string): void =>
    this.assemblyView?.setValue(value);
  readonly setStraceValue = (value: string): void =>
    this.straceView?.setValue(value);

  readonly applyThemeToAllEditors = (themeName: string): void => {
    const theme =
      themeName !== EDITOR_CONFIG.DEFAULT_THEME
        ? themeName
        : EDITOR_CONFIG.DEFAULT_THEME;
    this.setOptionForAll("theme", theme);
  };

  readonly setFontSize = (size: number): void => {
    this.currentFontSize = size;
    this.forEachEditor((editor) => {
      editor.getWrapperElement().style.fontSize = `${size}px`;
    });

    this.debouncedRefresh();
  };

  readonly refreshAllEditors = (): void => {
    this.forEachEditor((editor) => editor.refresh());
  };

  // Vim mode management
  readonly setVimMode = (enabled: boolean): void => {
    this.editor?.setOption("keyMap", enabled ? "vim" : "default");
    this.updateVimStatusVisibility(enabled);

    if (enabled) {
      this.setupVimKeyMappings();
      this.setupVimModeChangeListener();
    }
  };

  readonly initializeVimStatus = (): void => {
    if (!this.editor) return;

    const keyMap = this.editor.getOption("keyMap");
    const isVimEnabled = keyMap?.startsWith("vim") ?? false;
    this.updateVimStatusVisibility(isVimEnabled);

    if (isVimEnabled) {
      this.setupVimModeChangeListener();
    }
  };

  private readonly updateVimStatusVisibility = (enabled: boolean): void => {
    const vimStatusElement = document.getElementById("vim-status");
    if (!vimStatusElement) return;

    if (enabled) {
      vimStatusElement.style.display = "block";
      vimStatusElement.textContent = EDITOR_CONFIG.VIM_STATUS.NORMAL;
    } else {
      vimStatusElement.style.display = "none";
    }
  };

  private readonly setupVimModeChangeListener = (): void => {
    if (!this.editor) return;

    // Remove existing listener to avoid duplicates
    (this.editor as any).off("vim-mode-change");

    // Add new listener
    (this.editor as any).on("vim-mode-change", ({ mode }: { mode: string }) => {
      const vimStatusElement = document.getElementById("vim-status");
      if (!vimStatusElement) return;

      vimStatusElement.textContent = EDITOR_CONFIG.VIM_STATUS.UPPER(mode);

      // Ensure status is visible when in vim mode
      const keyMap = this.editor?.getOption("keyMap");
      if (keyMap?.startsWith("vim")) {
        vimStatusElement.style.display = "block";
      }
    });
  };

  private readonly setupVimKeyMappings = (): void => {
    const editor = this.editor;
    if (!editor) return;

    const CodeMirror = (editor as any).constructor;
    if (CodeMirror && CodeMirror.Vim) {
      // Map jk to Escape in insert mode
      CodeMirror.Vim.map("jk", "<Esc>", "insert");
    }
  };

  private readonly forEachEditor = (
    callback: (editor: CodeMirror.Editor) => void
  ): void => {
    this.activeEditors.forEach(callback);
  };
}

const setupEditors = (): EditorInstances => {
  const codeElement = document.getElementById("code") as HTMLTextAreaElement;
  const outputElement = document.getElementById("output") as HTMLDivElement;

  if (!codeElement || !outputElement) {
    throw new Error("Required DOM elements not found");
  }

  // Get current theme
  const themeName = themeManager.getCurrentThemeName();
  const theme =
    themeName !== EDITOR_CONFIG.DEFAULT_THEME
      ? themeName
      : EDITOR_CONFIG.DEFAULT_THEME;

  const editorConfig: CodeMirror.EditorConfiguration = {
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
  };

  // Create main editor instance
  const editor = CodeMirror.fromTextArea(codeElement, editorConfig);

  const readOnlyConfig: CodeMirror.EditorConfiguration = {
    lineNumbers: true,
    readOnly: true,
    lineWrapping: true,
    theme,
  };

  // Assembly (gas)
  const assemblyView = CodeMirror(document.createElement("div"), {
    ...readOnlyConfig,
    mode: "gas",
  });

  // Strace (c-like)
  const straceView = CodeMirror(document.createElement("div"), {
    ...readOnlyConfig,
    mode: "text/x-csrc", // C-like syntax highlighting for strace
  });

  return { editor, assemblyView, straceView };
};

const setupFontZoomHandler = (): void => {
  const editorService = EditorService.getInstance();
  let fontSize = 14; // Start with default font size

  editorService.setFontSize(fontSize);

  document.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();

      const delta = event.deltaY < 0 ? 1 : -1;
      // Adjust font size with limits
      fontSize = Math.max(10, Math.min(30, fontSize + delta));

      editorService.setFontSize(fontSize);
    },
    { passive: false }
  );
};

export const getEditorService = (): EditorService =>
  EditorService.getInstance();

// Initialize all editors and related services
export const initEditors = (): void => {
  const editorInstances = setupEditors();

  const editorService = EditorService.getInstance();
  editorService.setEditors(editorInstances);

  // Setup additional features
  setupFontZoomHandler();

  // Initialize vim status through EditorService
  editorService.initializeVimStatus();
};
