// src/rules/linkText.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects links whose visible text is too generic to describe the destination. */
export const linkTextRule: A11yRule = {
  id: "link-generic-text",
  check(text, document) {
    const genericTexts = new Set([
      "clique aqui",
      "saiba mais",
      "leia mais",
      "click here",
      "read more",
      "more",
    ]);

    /**
     * Matches anchor elements and captures their inner content.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;

    /**
     * Removes nested HTML/JSX tags from anchor content before text comparison.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate text extraction.
     */
    const nestedTagRegex = /<[^>]+>/g;

    return [...text.matchAll(linkRegex)].flatMap((match) => {
      const innerText = (match[1] ?? "")
        .replace(nestedTagRegex, "")
        .trim()
        .toLowerCase();

      if (!genericTexts.has(innerText)) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Texto de link genérico. Use um texto que descreva melhor o destino ou a ação.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
