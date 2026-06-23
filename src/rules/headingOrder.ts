// src/rules/headingOrder.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects heading levels that skip ranks (e.g. h1 → h3), breaking logical document structure. */
export const headingOrderRule: A11yRule = {
  id: "heading-order",
  check(text, document) {
    /**
     * Matches heading tags (h1–h6) and captures the level number.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate heading detection.
     */
    const headingRegex = /<h([1-6])\b[^>]*>/gi;

    const matches = [...text.matchAll(headingRegex)];
    const diagnostics: vscode.Diagnostic[] = [];
    let previousLevel = 0;

    for (const match of matches) {
      const currentLevel = parseInt(match[1], 10);

      // A jump of more than 1 level is a violation (e.g. h1 → h3)
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        diagnostics.push(
          makeDiagnostic(
            document,
            match.index,
            match[0].length,
            `Hierarquia de headings incorreta: h${previousLevel} seguido de h${currentLevel}. Não pule níveis de heading.`,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }

      previousLevel = currentLevel;
    }

    return diagnostics;
  },
};
