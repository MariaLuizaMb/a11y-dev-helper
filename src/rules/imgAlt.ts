// src/rules/imgAlt.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <img> elements without an alt attribute. */
export const imgAltRule: A11yRule = {
  id: "img-missing-alt",
  check(text, document) {
    /**
     * Matches opening <img> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML/JSX detection.
     */
    const imgTagRegex = /<img\b([^>]*)>/gi;

    /**
     * Detects the presence of an alt attribute inside an attribute string.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute detection.
     */
    const altAttributeRegex = /\balt\s*=/i;

    return [...text.matchAll(imgTagRegex)].flatMap((match) => {
      if (altAttributeRegex.test(match[1] ?? "")) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          'Imagem sem atributo alt. Adicione uma descrição se a imagem transmitir informação ou use alt="" se for decorativa.',
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
