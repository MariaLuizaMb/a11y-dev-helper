// src/rules/linkNoHref.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <a> elements without an href attribute, which are not keyboard-focusable by default. */
export const linkNoHrefRule: A11yRule = {
  id: "link-missing-href",
  check(text, document) {
    /**
     * Matches opening <a> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const anchorRegex = /<a\b([^>]*)>/gi;

    /**
     * Detects the presence of an href attribute (including empty href="").
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const hrefRegex = /\bhref\s*=/i;

    return [...text.matchAll(anchorRegex)].flatMap((match) => {
      if (hrefRegex.test(match[1] ?? "")) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "Link sem atributo href. Sem href, o elemento não é focável pelo teclado. Use um <button> para ações ou adicione um href válido.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
