// ==========================================
// Common Types
// ==========================================

// Platform detection
export type PlatformType = "MacOS" | "Other";

// ==========================================
// UI & Layout
// ==========================================

// Layout panel state
export interface PanelState {
  isOutputVisible: boolean;
}

// UI global state
export interface UIState {
  isOutputVisible: boolean;
  isLoading: boolean;
  loadingMessage: string;
  compilationState: CompilationState;
  isProcessRunning?: boolean;
  isDebuggingActive?: boolean; // Add debugging active state
  theme: string;
}

// DOM elements for accessing UI elements
export interface DOMElements {
  template: HTMLElement | null;
  language: HTMLSelectElement | null;
  output: HTMLElement | null;
  compile: HTMLElement | null;
  memcheck: HTMLElement | null;
  format: HTMLElement | null;
  viewAssembly: HTMLElement | null;
  styleCheck: HTMLElement | null;
  debug: HTMLElement | null; // Added debug button
  themeSelect: HTMLSelectElement | null;
  outputPanel: HTMLElement | null;
  closeOutput: HTMLElement | null;
  codesnap: HTMLElement | null;
  compiler: HTMLSelectElement | null;
  optimization: HTMLSelectElement | null;
}

// ==========================================
// Editor & CodeMirror
// ==========================================

// Editor instances
export interface EditorInstances {
  editor: CodeMirror.Editor;
  assemblyView: CodeMirror.Editor;
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

// Compilation state enum
export enum CompilationState {
  IDLE = "idle",
  COMPILING = "compiling",
  RUNNING = "running",
}

// CinCout socket interface
export interface CinCoutSocket {
  init: (messageHandler: (eventName: string, data: any) => void) => void;
  sendData: (data: any) => Promise<void>;
  isConnected: () => boolean;
  getSessionId: () => string | null;
  setSessionId: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setProcessRunning: (running: boolean) => void;
  isProcessRunning: () => boolean;
  updateStateFromMessage: (type: string) => void;
  getCompilationState: () => CompilationState | string;
}

// Interface for UI state updates
export interface CompileStateUpdater {
  updateCompilationState: (state: CompilationState | string) => void;
  updateProcessRunning?: (running: boolean) => void;
  showOutput: () => void;
  refreshEditor: () => void;
}

// Interface for debug state updates
export interface DebugStateUpdater {
  updateDebugState: (state: CompilationState | string) => void;
  setDebuggingActive: (active: boolean) => void;
  showOutput: () => void;
  refreshEditor: () => void;
}

// Debug session status
export enum DebugState {
  IDLE = "idle",
  COMPILING = "compiling",
  DEBUGGING = "debugging",
}

// ==========================================
// Terminal
// ==========================================

// Terminal DOM elements
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
  STYLE_CHECK = "styleCheck",
  MEMORY_CHECK = "memcheck",
  DEBUG = "debug",
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

// Mapping of key combos to shortcut definitions
export type ShortcutMap = Record<string, ShortcutDefinition>;

// Categories of shortcuts
export interface ShortcutCategories {
  common: ShortcutMap;
  mac: ShortcutMap;
  other: ShortcutMap;
  special: ShortcutMap;
}

// Shortcut state
export interface ShortcutState {
  currentOS: PlatformType;
  isMac: boolean;
  shortcuts: ShortcutCategories;
}
