// src/rules/tableCaption.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  hasAnyAttr,
  openingTagLocation,
} from "../utils/htmlAst";

/**
 * Detects <table> elements without a <caption> child or accessible name attribute.
 *
 * Uses parse5 for HTML files — eliminates false positives from nested tables
 * that confused the regex approach.
 *
 * WCAG 1.3.1 Info and Relationships (Level A)
 */
export const tableCaptionRule: A11yRule = {
  id: "table-missing-caption",
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
    if (node.tagName !== "table") {
      return;
    }

    // Accept aria-label, aria-labelledby, or summary as alternatives to <caption>
    if (hasAnyAttr(node, "aria-label", "aria-labelledby", "summary")) {
      return;
    }

    // Check for a <caption> among direct children
    const hasCaption = (node.childNodes ?? []).some(
      (child) =>
        "tagName" in child &&
        (child as { tagName: string }).tagName === "caption",
    );

    if (hasCaption) {
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
        "Tabela sem <caption> ou aria-label. Adicione um <caption> descritivo para que leitores de tela identifiquem o propósito da tabela.",
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
   * NOTE: Regex fallback for JSX/TSX. Nested tables are not handled correctly.
   * Replace with @babel/parser in a future phase.
   */
  const tableRegex = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  const captionRegex = /<caption\b/i;
  const accessibleNameRegex = /\b(?:aria-label|aria-labelledby|summary)\s*=/i;

  return [...text.matchAll(tableRegex)].flatMap((match) => {
    if (
      accessibleNameRegex.test(match[1] ?? "") ||
      captionRegex.test(match[2] ?? "")
    ) {
      return [];
    }
    return [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        "Tabela sem <caption> ou aria-label. Adicione um <caption> descritivo para que leitores de tela identifiquem o propósito da tabela.",
        vscode.DiagnosticSeverity.Warning,
      ),
    ];
  });
}
