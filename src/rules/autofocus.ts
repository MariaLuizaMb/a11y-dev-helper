// src/rules/autofocus.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects autofocus/autoFocus usage. */
export const autofocusRule: A11yRule = {
  id: "autofocus",
  check(text, document) {
    /**
     * Matches autofocus attributes in HTML and autoFocus attributes in JSX/TSX.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute detection.
     */
    const autofocusRegex = /\bautofocus\b|\bautoFocus\b/gi;

    return [...text.matchAll(autofocusRegex)].flatMap((match) => [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        "O uso de autofocus pode prejudicar a navegação de usuários de teclado e leitores de tela. Use com cuidado.",
        vscode.DiagnosticSeverity.Information,
      ),
    ]);
  },
};
