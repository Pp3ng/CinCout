/**
 * Centralized Type Definitions for the CinCout Backend
 * This file contains all common types used across the backend
 * Updated for Koa compatibility and dependency injection
 */
import * as pty from "node-pty";
import { DirResult } from "tmp";
import { Socket } from "socket.io";
import { Context } from "koa";

// ==========================================
// Server & API Types
// ==========================================

/**
 * Standard API response structure
 */
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Base request interface for code operations
 */
export interface CodeRequest {
  code: string;
  lang: string;
  compiler?: string;
  optimization?: string;
}

/**
 * Koa extended context with typed request body
 */
export interface KoaRequestContext<T = any> extends Context {
  request: Context["request"] & {
    body: T;
  };
}

/**
 * Application Error with status code
 */
export class AppError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ==========================================
// Compilation Types
// ==========================================

/**
 * Compilation environment configuration
 */
export interface CompilationEnvironment {
  tmpDir: DirResult;
  sourceFile: string;
  outputFile: string;
  asmFile: string;
}

/**
 * Compilation options
 */
export interface CompilationOptions {
  lang: string; // 'c' or 'cpp'
  compiler?: string; // 'gcc', 'g++', 'clang', 'clang++'
  optimization?: string; // Optimization level
  standard?: string; // Language standard override
}

/**
 * Shell command execution results
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Compilation result
 */
export interface CompilationResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Assembly generation result
 */
export interface AssemblyResult {
  success: boolean;
  assembly?: string;
  error?: string;
}

/**
 * Memory check result
 */
export interface MemoryCheckResult {
  success: boolean;
  report?: string;
  error?: string;
}

/**
 * Style check result
 */
export interface StyleCheckResult {
  success: boolean;
  report?: string;
  error?: string;
}

/**
 * Format code result
 */
export interface FormatResult {
  success: boolean;
  formattedCode?: string;
  error?: string;
}

/**
 * GDB debug session result
 */
export interface DebugSessionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ==========================================
// Session Types
// ==========================================

/**
 * Session information
 */
export interface Session {
  pty: pty.IPty;
  tmpDir: DirResult;
  lastActivity: number;
  dimensions: { cols: number; rows: number };
  sessionType: string;
  socketId?: string; // Optional Socket.IO socket ID for reference
  isDebugSession?: boolean; // Whether this is a GDB debug session
}

// ==========================================
// Socket.IO Types
// ==========================================

/**
 * Socket.IO message structure
 */
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Extended Socket.IO socket with session information
 */
export interface SessionSocket extends Socket {
  sessionId: string;
  isAlive?: boolean; // For heartbeat checking
}

/**
 * Socket event types enum
 */
export enum SocketEvents {
  // Connection lifecycle events
  CONNECT = "connect",
  DISCONNECT = "disconnect",

  // Compilation events
  COMPILE = "compile",
  COMPILING = "compiling",
  COMPILE_SUCCESS = "compile_success",
  COMPILE_ERROR = "compile_error",

  // Execution events
  OUTPUT = "output",
  INPUT = "input",
  EXIT = "exit",
  RESIZE = "resize",

  // Session management
  SESSION_CREATED = "session_created",
  CLEANUP = "cleanup",
  CLEANUP_COMPLETE = "cleanup_complete",

  // Error handling
  ERROR = "error",

  // GDB Debugging events
  DEBUG_START = "debug_start",
  DEBUG_COMMAND = "debug_command",
  DEBUG_RESPONSE = "debug_response",
  DEBUG_ERROR = "debug_error",
  DEBUG_EXIT = "debug_exit",
}

// ==========================================
// Service Interfaces - For Dependency Injection
// ==========================================

/**
 * Compilation service interface
 */
export interface ICompilationService {
  createCompilationEnvironment(lang: string): CompilationEnvironment;
  writeCodeToFile(filePath: string, code: string): void;
  compileCode(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<CompilationResult>;
  generateAssembly(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<AssemblyResult>;
  runMemoryCheck(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<MemoryCheckResult>;
  formatCode(code: string, style?: string): Promise<FormatResult>;
  runStyleCheck(code: string): Promise<StyleCheckResult>;
  startDebugSession(
    env: CompilationEnvironment,
    options: CompilationOptions
  ): Promise<DebugSessionResult>;
}

/**
 * Session service interface
 */
export interface ISessionService {
  initSessionService(): void;
  createSession(socket: Socket): string;
  startCompilationSession(
    socket: Socket,
    sessionId: string,
    tmpDir: DirResult,
    outputFile: string
  ): boolean;
  startDebugSession(
    socket: Socket,
    sessionId: string,
    tmpDir: DirResult,
    outputFile: string
  ): boolean;
  sendInputToSession(sessionId: string, input: string): boolean;
  resizeTerminal(sessionId: string, cols: number, rows: number): boolean;
  terminateSession(sessionId: string): void;
  getActiveSessions(): Map<string, Session>;
  getSession(sessionId: string): Session | undefined;
}

/**
 * WebSocket management interface
 */
export interface IWebSocketManager {
  initialize(server: any): any;
  emitToClient(socket: Socket, event: string, data: any): void;
}

// ==========================================
// Route Types
// ==========================================

/**
 * Assembly route request
 */
export interface AssemblyRequest extends CodeRequest {}

/**
 * Format route request
 */
export interface FormatRequest extends CodeRequest {}

/**
 * Memory check route request
 */
export interface MemcheckRequest extends CodeRequest {}

/**
 * Style check route request
 */
export interface StyleCheckRequest extends CodeRequest {}

/**
 * Debug route request
 */
export interface DebugRequest extends CodeRequest {}
