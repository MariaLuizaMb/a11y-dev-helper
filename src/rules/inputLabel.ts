// src/rules/inputLabel.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects input fields without an accessible label. */
export const inputLabelRule: A11yRule = {
  id: "input-missing-label",
  check(text, document) {
    // NOTE: This rule uses regex for MVP. Replace with AST parser for accurate label association.
    const ignoredInputTypes = new Set([
      "hidden",
      "submit",
      "reset",
      "button",
      "image",
    ]);

    /**
     * Matches <label> tags with for/htmlFor attributes and captures the referenced id.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate label association.
     */
    const labelForRegex = /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*(["'])([^"']+)\1[^>]*>/gi;

    /**
     * Matches opening <input> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const inputTagRegex = /<input\b([^>]*)>/gi;

    /**
     * Captures an id attribute value from an attribute string.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const idAttributeRegex = /\bid\s*=\s*(["'])([^"']+)\1/i;

    /**
     * Captures a type attribute value from an attribute string.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const typeAttributeRegex = /\btype\s*=\s*(["'])([^"']+)\1/i;

    /**
     * Detects attributes that provide an accessible name directly on the input.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const accessibleNameAttributeRegex = /\b(?:aria-label|aria-labelledby|title)\s*=/i;

    const labelledInputIds = new Set(
      [...text.matchAll(labelForRegex)].flatMap((match) => [match[2] ?? ""]),
    );

    return [...text.matchAll(inputTagRegex)].flatMap((match) => {
      const attributes = match[1] ?? "";
      const inputType = typeAttributeRegex.exec(attributes)?.[2]?.toLowerCase();

      if (inputType !== undefined && ignoredInputTypes.has(inputType)) {
        return [];
      }

      if (accessibleNameAttributeRegex.test(attributes)) {
        return [];
      }

      const inputId = idAttributeRegex.exec(attributes)?.[2];

      if (inputId !== undefined && labelledInputIds.has(inputId)) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Campo sem label acessível. Associe um <label>, ou use aria-label / aria-labelledby.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
