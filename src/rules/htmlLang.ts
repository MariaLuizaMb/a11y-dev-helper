// src/rules/htmlLang.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  hasAttr,
  openingTagLocation,
} from "../utils/htmlAst";

/**
 * Detects <html> elements without a lang attribute.
 *
 * Uses parse5 for HTML files. The rule is HTML-only by nature —
 * JSX/TSX files do not contain a root <html> tag in practice.
 *
 * WCAG 3.1.1 Language of Page (Level A)
 */
export const htmlLangRule: A11yRule = {
  id: "html-missing-lang",
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
    if (node.tagName !== "html") {
      return;
    }
    if (hasAttr(node, "lang")) {
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
        'A tag <html> não possui atributo lang. Defina o idioma principal da página, como lang="pt-BR".',
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
  const htmlTagRegex = /<html\b([^>]*)>/gi;
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
}
