// src/rules/linkNoHref.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import { walkNodes, hasAttribute } from "../utils/astWalker";
import type { ParsedNode } from "../utils/htmlAst";

const MSG =
  "Link sem atributo href. Sem href, o elemento não é focável pelo teclado. Use um elemento button para ações ou adicione um href válido.";

export const linkNoHrefRule: A11yRule = {
  id: "link-missing-href",
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
    if (node.tagName?.toLowerCase() !== "a") return;
    if (hasAttribute(node, "href")) return;
    const start = node.start ?? 0;
    const end = node.end ?? start;
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(document.positionAt(start), document.positionAt(end)),
        MSG,
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
  return [...text.matchAll(/<a\b([^>]*)>/gi)].flatMap((m) =>
    /\bhref\s*=/i.test(m[1] ?? "")
      ? []
      : [
          makeDiagnostic(
            document,
            m.index,
            m[0].length,
            MSG,
            vscode.DiagnosticSeverity.Warning,
          ),
        ],
  );
}
