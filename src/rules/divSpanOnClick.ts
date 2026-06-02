// src/rules/divSpanOnClick.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects non-semantic div/span elements with click handlers. */
export const divSpanOnClickRule: A11yRule = {
  id: "div-span-onclick",
  check(text, document) {
    /**
     * Matches opening <div> or <span> tags that declare an onClick handler.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate event handler detection.
     */
    const onClickRegex = /<(div|span)\b[^>]*\bonClick\s*[={][^>]*>/gi;

    return [...text.matchAll(onClickRegex)].flatMap((match) => [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        "Elemento não semântico com evento de clique. Considere usar um <button> ou adicionar suporte adequado a teclado, role e tabIndex.",
        vscode.DiagnosticSeverity.Warning,
      ),
    ]);
  },
};
