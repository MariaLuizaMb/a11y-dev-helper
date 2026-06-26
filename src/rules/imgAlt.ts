// src/rules/imgAlt.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  hasAttr,
  openingTagLocation,
} from "../utils/htmlAst";

/**
 * Detects <img> elements without an alt attribute.
 *
 * Uses parse5 for HTML files — accurate across multiline tags and inside
 * deeply nested structures. Falls back to regex for JSX/TSX files where
 * parse5 would misinterpret JSX expressions.
 *
 * WCAG 1.1.1 Non-text Content (Level A)
 */
export const imgAltRule: A11yRule = {
  id: "img-missing-alt",
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
    if (node.tagName !== "img") {
      return;
    }
    if (hasAttr(node, "alt")) {
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
        'Imagem sem atributo alt. Adicione uma descrição se a imagem transmitir informação ou use alt="" se for decorativa.',
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
   * Matches self-closing <img .../> or <img ...> tags and captures attributes.
   * NOTE: Regex fallback for JSX/TSX. Replace with @babel/parser in a future phase.
   */
  const imgTagRegex = /<img\b([^>]*)>/gi;
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
}
