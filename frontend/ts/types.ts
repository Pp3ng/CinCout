// ==========================================
// Editor & CodeMirror
// ==========================================

// Editor instances
export interface EditorInstances {
  editor: any; // CodeMirror.Editor
  assemblyView: any; // CodeMirror.Editor
  straceView: any; // CodeMirror.Editor
}

// ==========================================
// Templates
// ==========================================

// Template cache structure
export interface TemplateCache {
  lists: Record<string, string[]>;
  contents: Record<string, string>;
}

// ==========================================
// WebSocket & Compilation
// ==========================================

// Compile options for code execution
export interface CompileOptions {
  lang: string;
  compiler: string;
  optimization: string;
  code: string;
}

// WebSocket message structure
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// ==========================================
// Terminal
// ==========================================

export interface TerminalDomElements {
  output?: HTMLElement | null;
  outputPanel?: HTMLElement | null;
}

// Terminal configuration
export interface TerminalOptions {
  cursorBlink?: boolean;
  cursorStyle?: "block" | "underline" | "bar";
  fontSize?: number;
  fontFamily?: string;
  theme?: any;
  allowTransparency?: boolean;
  rendererType?: string;
  convertEol?: boolean;
}

// ==========================================
// Theme System
// ==========================================

// Theme mapping type
export type ThemeMap = Record<string, Theme>;

// Terminal colors definition
export interface TerminalColors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
}

// Theme properties
export interface Theme {
  name: string;
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  border: string;
  terminal: TerminalColors;
}

// Terminal theme configuration
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  [key: string]: string;
}

// ==========================================
// Keyboard Shortcuts
// ==========================================

// DOM element IDs for shortcut targets
export enum DomElementId {
  COMPILE = "compile",
  CLOSE_OUTPUT = "closeOutput",
  VIEW_ASSEMBLY = "viewAssembly",
  FORMAT = "format",
  LINT_CODE = "lintCode",
  MEMORY_CHECK = "memcheck",
  DEBUG = "debug",
  SYSCALL = "syscall",
  OUTPUT_PANEL = "outputPanel",
  LANGUAGE = "language",
  SHORTCUTS_CONTENT = "shortcuts-content",
  CODESNAP = "codeSnap",
  ZEN_MODE = "zenMode",
}

// Shortcut definition
export interface ShortcutDefinition {
  action: () => void;
  description: string;
  displayKeys: string[];
}

// Categories of shortcuts
export interface ShortcutCategories {
  common: ShortcutMap;
  mac: ShortcutMap;
  other: ShortcutMap;
  special: ShortcutMap;
}

// Mapping of key combos to shortcut definitions
type ShortcutMap = Record<string, ShortcutDefinition>;
