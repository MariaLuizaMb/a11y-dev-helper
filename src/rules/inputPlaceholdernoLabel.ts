// src/rules/inputPlaceholderNoLabel.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/**
 * Detects <input> elements that rely solely on placeholder as a label.
 * placeholder disappears on typing and is not reliably announced by screen readers.
 */
export const inputPlaceholderNoLabelRule: A11yRule = {
  id: "input-placeholder-no-label",
  check(text, document) {
    const ignoredInputTypes = new Set([
      "hidden",
      "submit",
      "reset",
      "button",
      "image",
    ]);

    /**
     * Matches <label> tags with for/htmlFor and captures the referenced id.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate label association.
     */
    const labelForRegex =
      /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*(["'])([^"']+)\1[^>]*>/gi;

    /**
     * Matches <input> tags that contain a placeholder attribute.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute detection.
     */
    const inputWithPlaceholderRegex =
      /<input\b([^>]*\bplaceholder\s*=[^>]*)>/gi;

    /** Captures a type attribute value. */
    const typeAttributeRegex = /\btype\s*=\s*(["'])([^"']+)\1/i;

    /** Captures an id attribute value. */
    const idAttributeRegex = /\bid\s*=\s*(["'])([^"']+)\1/i;

    /** Detects accessible name attributes on the element itself. */
    const accessibleNameRegex = /\b(?:aria-label|aria-labelledby|title)\s*=/i;

    // First pass: collect ids that already have a <label for="...">
    const labelledIds = new Set(
      [...text.matchAll(labelForRegex)].map((m) => m[2] ?? ""),
    );

    return [...text.matchAll(inputWithPlaceholderRegex)].flatMap((match) => {
      const attributes = match[1] ?? "";
      const inputType = typeAttributeRegex.exec(attributes)?.[2]?.toLowerCase();

      if (inputType !== undefined && ignoredInputTypes.has(inputType)) {
        return [];
      }

      // Already has an accessible name via attribute
      if (accessibleNameRegex.test(attributes)) {
        return [];
      }

      // Already labelled via <label for>
      const inputId = idAttributeRegex.exec(attributes)?.[2];
      if (inputId !== undefined && labelledIds.has(inputId)) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Campo usando placeholder como único rótulo. O placeholder desaparece ao digitar e não substitui um <label> ou aria-label.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
