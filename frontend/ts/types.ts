// ==========================================
// Common Types
// ==========================================

// Active tab selection
export type ActiveTab = "output" | "assembly";

// Platform detection
export type PlatformType = "MacOS" | "Other";

// ==========================================
// UI & Layout
// ==========================================

// Layout panel state
export interface PanelState {
  isOutputVisible: boolean;
  activeTab: ActiveTab;
}

// UI global state
export interface UIState {
  isOutputVisible: boolean;
  activeTab: ActiveTab;
  isLoading: boolean;
  loadingMessage: string;
  compilationState: CompilationState;
  isProcessRunning?: boolean;
  theme: string;
  vimMode: boolean;
}

// DOM elements for accessing UI elements
export interface DOMElements {
  template: HTMLElement | null;
  vimMode: HTMLInputElement | null;
  language: HTMLSelectElement | null;
  outputTab: HTMLElement | null;
  assemblyTab: HTMLElement | null;
  output: HTMLElement | null;
  assembly: HTMLElement | null;
  compile: HTMLElement | null;
  memcheck: HTMLElement | null;
  format: HTMLElement | null;
  viewAssembly: HTMLElement | null;
  styleCheck: HTMLElement | null;
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
// Templates
// ==========================================

// Template cache structure
export interface TemplateCache {
  lists: Record<string, string[]>;
  contents: Record<string, string>;
}

// ==========================================
// Selector & Custom UI
// ==========================================

// Select option representation
export interface SelectOption {
  readonly value: string;
  readonly text: string;
  readonly selected: boolean;
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
  init: (messageHandler: (event: MessageEvent) => void) => void;
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
  activateOutputTab: () => void;
  refreshEditor: () => void;
}

// ==========================================
// Terminal
// ==========================================

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
  OUTPUT_PANEL = "outputPanel",
  LANGUAGE = "language",
  SHORTCUTS_CONTENT = "shortcuts-content",
  CODESNAP = "codeSnap",
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

// Keyboard event handler type
export type KeyHandler = (e: KeyboardEvent) => boolean;
