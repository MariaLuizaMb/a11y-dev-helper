// src/rules/iframeTitle.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <iframe> elements without a title attribute, which screen readers need to describe the frame. */
export const iframeTitleRule: A11yRule = {
  id: "iframe-missing-title",
  check(text, document) {
    /**
     * Matches <iframe> tags and captures their attributes.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate HTML detection.
     */
    const iframeRegex = /<iframe\b([^>]*)>/gi;

    /**
     * Detects a non-empty title attribute.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const titleRegex = /\btitle\s*=\s*(["'])[^"']+\1/i;

    return [...text.matchAll(iframeRegex)].flatMap((match) => {
      if (titleRegex.test(match[1] ?? "")) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "iframe sem atributo title. Adicione um title descritivo para que leitores de tela identifiquem o conteúdo do frame.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
