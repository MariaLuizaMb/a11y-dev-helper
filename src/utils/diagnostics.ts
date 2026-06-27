// src/utils/diagnostics.ts

import * as vscode from "vscode";
import type { ParsedNode } from "./htmlAst";

export interface A11yRule {
  id: string;

  check: (
    text: string,
    document: vscode.TextDocument,
    ast?: ParsedNode,
  ) => vscode.Diagnostic[];
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

  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(start, end),
    message,
    severity,
  );

  diagnostic.source = "A11y Dev Helper";

  return diagnostic;
}