// src/rules/buttonName.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects buttons without visible text or another accessible name. */
export const buttonNameRule: A11yRule = {
  id: "button-missing-name",
  check(text, document) {
    // NOTE: Regex cannot detect dynamically inserted icon content. AST parsing recommended.
    /**
     * Matches button elements and captures their attributes and inner content.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;

    /**
     * Removes nested HTML/JSX tags from button content before text comparison.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate text extraction.
     */
    const nestedTagRegex = /<[^>]+>/g;

    /**
     * Detects attributes that provide an accessible name directly on the button.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const accessibleNameAttributeRegex = /\b(?:aria-label|aria-labelledby|title)\s*=/i;

    return [...text.matchAll(buttonRegex)].flatMap((match) => {
      const attributes = match[1] ?? "";

      if (accessibleNameAttributeRegex.test(attributes)) {
        return [];
      }

      const visibleText = (match[2] ?? "").replace(nestedTagRegex, "").trim();

      if (visibleText.length > 0) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Botão sem nome acessível. Adicione um texto visível, aria-label ou title.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
