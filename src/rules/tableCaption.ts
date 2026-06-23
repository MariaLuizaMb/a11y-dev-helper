// src/rules/tableCaption.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <table> elements without a <caption> or aria-label, which screen readers need to identify the table. */
export const tableCaptionRule: A11yRule = {
  id: "table-missing-caption",
  check(text, document) {
    /**
     * Matches full <table>...</table> blocks and captures opening tag attributes and inner content.
     * NOTE: Regex is used for MVP. Nested tables will not be handled correctly.
     * Replace with AST parsing for accurate detection.
     */
    const tableRegex = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;

    /**
     * Detects the presence of a <caption> element inside a table.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate child detection.
     */
    const captionRegex = /<caption\b/i;

    /**
     * Detects accessible name attributes that describe the table without a <caption>.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const accessibleNameRegex = /\b(?:aria-label|aria-labelledby|summary)\s*=/i;

    return [...text.matchAll(tableRegex)].flatMap((match) => {
      const attributes = match[1] ?? "";
      const innerContent = match[2] ?? "";

      if (
        accessibleNameRegex.test(attributes) ||
        captionRegex.test(innerContent)
      ) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Tabela sem <caption> ou aria-label. Adicione um <caption> descritivo para que leitores de tela identifiquem o propósito da tabela.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
