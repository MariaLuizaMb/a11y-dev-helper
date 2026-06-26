// src/rules/headingOrder.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import { parseHtml, walkTree, openingTagLocation } from "../utils/htmlAst";

/**
 * Detects heading levels that skip ranks (e.g. h1 → h3), breaking
 * the logical document structure required by screen readers.
 *
 * Uses parse5 for HTML files — the AST preserves document order
 * precisely, eliminating false positives from headings inside
 * comments or template strings.
 *
 * WCAG 1.3.1 Info and Relationships (Level A)
 * WCAG 2.4.6 Headings and Labels (Level AA)
 */
export const headingOrderRule: A11yRule = {
  id: "heading-order",
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

  let previousLevel = 0;

  // walkTree visits nodes in document order — correct for sequential comparison
  walkTree(tree, (node) => {
    if (!/^h[1-6]$/.test(node.tagName)) {
      return;
    }

    const currentLevel = parseInt(node.tagName[1], 10);

    if (previousLevel > 0 && currentLevel > previousLevel + 1) {
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
          `Hierarquia de headings incorreta: h${previousLevel} seguido de h${currentLevel}. Não pule níveis de heading.`,
          vscode.DiagnosticSeverity.Warning,
        ),
      );
    }

    previousLevel = currentLevel;
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
  const headingRegex = /<h([1-6])\b[^>]*>/gi;
  const diagnostics: vscode.Diagnostic[] = [];
  let previousLevel = 0;

  for (const match of text.matchAll(headingRegex)) {
    const currentLevel = parseInt(match[1], 10);

    if (previousLevel > 0 && currentLevel > previousLevel + 1) {
      diagnostics.push(
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          `Hierarquia de headings incorreta: h${previousLevel} seguido de h${currentLevel}. Não pule níveis de heading.`,
          vscode.DiagnosticSeverity.Warning,
        ),
      );
    }

    previousLevel = currentLevel;
  }

  return diagnostics;
}
