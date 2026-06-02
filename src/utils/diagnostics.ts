// src/utils/diagnostics.ts
import * as vscode from "vscode";

export interface A11yRule {
  id: string;
  check: (text: string, document: vscode.TextDocument) => vscode.Diagnostic[];
}

export function makeDiagnostic(
  document: vscode.TextDocument,
  index: number,
  length: number,
  message: string,
  severity: vscode.DiagnosticSeverity,
): vscode.Diagnostic {
  const start = document.positionAt(index);
  const end = document.positionAt(index + length);
  const range = new vscode.Range(start, end);
  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = "A11y Dev Helper";
  return diagnostic;
}
