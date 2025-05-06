/**
 * EditorService.ts
 * Provides methods to interact with the CodeMirror editor instance
 * Simplified to be more React-compatible without backwards compatibility
 */

import { CodeConfig } from "../context/UIStateContext";

export class EditorService {
  // Get the editor instance
  private static getEditor() {
    return (window as any).editor;
  }

  // Current configuration state
  private static currentConfig: CodeConfig = {
    language: "c",
    compiler: "gcc",
    optimization: "-O0",
  };

  // Editor operations
  static getValue(): string {
    return this.getEditor()?.getValue() || "";
  }

  static setValue(value: string): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setValue(value);
    }
  }

  static getCursor(): any {
    return this.getEditor()?.getCursor();
  }

  static setCursor(cursor: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setCursor(cursor);
    }
  }

  static getScrollInfo(): any {
    return this.getEditor()?.getScrollInfo();
  }

  static scrollTo(left: number, top: number): void {
    const editor = this.getEditor();
    if (editor) {
      editor.scrollTo(left, top);
    }
  }

  static refresh(): void {
    const editor = this.getEditor();
    if (editor) {
      editor.refresh();
    }
  }

  static setOption(key: string, value: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setOption(key, value);
    }
  }

  static setAssemblyValue(value: string): void {
    if ((window as any).assemblyView) {
      (window as any).assemblyView.setValue(value);
      (window as any).assemblyView.refresh();
    }
  }

  // Update from React context
  static updateFromConfig(config: CodeConfig): void {
    this.currentConfig = { ...config };
  }

  // Get current config
  static getConfig(): CodeConfig {
    return { ...this.currentConfig };
  }
}
