// src/rules/iframeTitle.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  attr,
  openingTagLocation,
} from "../utils/htmlAst";

/**
 * Detects <iframe> elements without a non-empty title attribute.
 *
 * Uses parse5 for HTML files.
 * WCAG 4.1.2 Name, Role, Value (Level A)
 */
export const iframeTitleRule: A11yRule = {
  id: "iframe-missing-title",
  check(text, document) {
    if (document.languageId === "html") {
      return checkWithAst(text, document);
    }
    return checkWithRegex(text, document);
  },
};

// ─── AST strategy (HTML) ─────────────────────────────────────────────────────

function checkWithAst(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const tree = parseHtml(text);

  walkTree(tree, (node) => {
    if (node.tagName !== "iframe") {
      return;
    }

    const titleValue = attr(node, "title");

    // Must be present AND non-empty
    if (titleValue !== undefined && titleValue.trim().length > 0) {
      return;
    }

    const loc = openingTagLocation(node);
    const range = loc
      ? new vscode.Range(
          document.positionAt(loc.startOffset),
          document.positionAt(loc.endOffset),
        )
      : new vscode.Range(document.positionAt(0), document.positionAt(0));

    diagnostics.push(
      new vscode.Diagnostic(
        range,
        "iframe sem atributo title. Adicione um title descritivo para que leitores de tela identifiquem o conteúdo do frame.",
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  });

  return diagnostics;
}

// ─── Regex fallback (JSX / TSX) ──────────────────────────────────────────────

function checkWithRegex(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  /**
   * NOTE: Regex fallback for JSX/TSX. Replace with @babel/parser in a future phase.
   */
  const iframeRegex = /<iframe\b([^>]*)>/gi;
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
}
