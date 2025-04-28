/**
 * Centralized Type Definitions for the CinCout Backend
 * This file contains all common types used across the backend
 */
import * as pty from "node-pty";
import { DirResult } from "tmp";
import { Socket } from "socket.io";

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
}

// ==========================================
// Socket.IO Types
// ==========================================

/**
 * Socket.IO message structure (previously WebSocketMessage)
 */
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Extended Socket.IO socket with session information
 */
export interface ExtendedSocket extends Socket {
  sessionId: string;
  isAlive?: boolean; // For backwards compatibility
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
