// src/rules/selectLabel.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/**
 * Detects <select> elements without an accessible label.
 * Mirrors the same two-pass strategy used by inputLabel.ts.
 *
 * A <select> is considered labelled when any of the following is true:
 * - A <label for="id"> or <label htmlFor="id"> references its id
 * - It has aria-label
 * - It has aria-labelledby
 * - It has title
 *
 * NOTE: This rule uses regex for MVP. Replace with AST parser for accurate label association.
 */
export const selectLabelRule: A11yRule = {
  id: "select-missing-label",
  check(text, document) {
    /**
     * Matches <label> tags with for/htmlFor and captures the referenced id.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate label association.
     */
    const labelForRegex =
      /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*(["'])([^"']+)\1[^>]*>/gi;

    /**
     * Matches opening <select> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const selectTagRegex = /<select\b([^>]*)>/gi;

    /**
     * Captures an id attribute value from an attribute string.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const idAttributeRegex = /\bid\s*=\s*(["'])([^"']+)\1/i;

    /**
     * Detects accessible name attributes that label the element directly.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const accessibleNameRegex = /\b(?:aria-label|aria-labelledby|title)\s*=/i;

    // First pass: collect all ids that already have a <label for="...">
    const labelledIds = new Set(
      [...text.matchAll(labelForRegex)].map((m) => m[2] ?? ""),
    );

    // Second pass: warn on every <select> that lacks an accessible name
    return [...text.matchAll(selectTagRegex)].flatMap((match) => {
      const attributes = match[1] ?? "";

      if (accessibleNameRegex.test(attributes)) {
        return [];
      }

      const selectId = idAttributeRegex.exec(attributes)?.[2];
      if (selectId !== undefined && labelledIds.has(selectId)) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Campo select sem label acessível. Associe um elemento label, ou use aria-label / aria-labelledby.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
