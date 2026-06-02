// src/rules/htmlLang.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <html> elements without a lang attribute. */
export const htmlLangRule: A11yRule = {
  id: "html-missing-lang",
  check(text, document) {
    /**
     * Matches opening <html> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML detection.
     */
    const htmlTagRegex = /<html\b([^>]*)>/gi;

    /**
     * Detects the presence of a lang attribute inside an attribute string.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute detection.
     */
    const langAttributeRegex = /\blang\s*=/i;

    return [...text.matchAll(htmlTagRegex)].flatMap((match) => {
      if (langAttributeRegex.test(match[1] ?? "")) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          'A tag <html> não possui atributo lang. Defina o idioma principal da página, como lang="pt-BR".',
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
