// src/rules/tabIndexPositive.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects elements with tabIndex/tabindex greater than 0, which disrupts natural tab order. */
export const tabIndexPositiveRule: A11yRule = {
  id: "tabindex-positive",
  check(text, document) {
    /**
     * Matches tabIndex or tabindex attributes with a value greater than 0.
     * Handles HTML (tabindex="2") and JSX (tabIndex={2}).
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute detection.
     */
    const tabIndexRegex =
      /\btabIndex\s*=\s*(?:\{([1-9]\d*)\}|(["'])([1-9]\d*)\2)|\btabindex\s*=\s*(["'])([1-9]\d*)\4/gi;

    return [...text.matchAll(tabIndexRegex)].flatMap((match) => [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        "tabIndex com valor positivo altera a ordem natural de foco e pode confundir usuários de teclado. Prefira tabIndex={0} ou tabIndex={-1}.",
        vscode.DiagnosticSeverity.Warning,
      ),
    ]);
  },
};
