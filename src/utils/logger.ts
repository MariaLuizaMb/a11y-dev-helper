// src/utils/logger.ts
import * as vscode from "vscode";

/**
 * Shared output channel for the extension.
 * Logs rule execution results and errors — visible via
 * View → Output → "A11y Dev Helper".
 */
let _channel: vscode.OutputChannel | undefined;

export function getChannel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel("A11y Dev Helper");
  }
  return _channel;
}

export function log(message: string): void {
  getChannel().appendLine(`[${timestamp()}] ${message}`);
}

export function logError(ruleId: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  getChannel().appendLine(`[${timestamp()}] ✗ rule "${ruleId}" failed: ${msg}`);
}

export function logSummary(
  file: string,
  ruleCount: number,
  diagCount: number,
  ms: number,
): void {
  getChannel().appendLine(
    `[${timestamp()}] ✓ ${file} — ${ruleCount} rules, ${diagCount} issue(s) — ${ms}ms`,
  );
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function disposeChannel(): void {
  _channel?.dispose();
  _channel = undefined;
}
