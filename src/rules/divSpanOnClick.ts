// src/rules/divSpanOnClick.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import { walkNodes, hasAttribute } from "../utils/astWalker";
import type { ParsedNode } from "../utils/htmlAst";

const NON_SEMANTIC = new Set(["div", "span"]);

export const divSpanOnClickRule: A11yRule = {
  id: "div-span-onclick",
  check(text, document, ast) {
    return ast ? checkAst(document, ast) : checkRegex(text, document);
  },
};

function checkAst(
  document: vscode.TextDocument,
  ast: ParsedNode,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  walkNodes(ast, (node) => {
    if (!NON_SEMANTIC.has(node.tagName?.toLowerCase() ?? "")) return;
    // normalizeAttrName maps "onClick" → "onclick"
    if (!hasAttribute(node, "onclick")) return;
    const start = node.start ?? 0;
    const end = node.end ?? start;
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(document.positionAt(start), document.positionAt(end)),
        "Elemento não semântico com evento de clique. Considere usar um elemento button ou adicionar suporte adequado a teclado, role e tabIndex.",
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  });
  return diagnostics;
}

function checkRegex(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  return [
    ...text.matchAll(/<(div|span)\b[^>]*\bonClick\s*[={][^>]*>/gi),
  ].flatMap((m) => [
    makeDiagnostic(
      document,
      m.index,
      m[0].length,
      "Elemento não semântico com evento de clique. Considere usar um elemento button ou adicionar suporte adequado a teclado, role e tabIndex.",
      vscode.DiagnosticSeverity.Warning,
    ),
  ]);
}
