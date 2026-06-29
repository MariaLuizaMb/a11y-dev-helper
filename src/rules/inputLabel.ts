// src/rules/inputLabel.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import { walkNodes, hasAnyAttribute, getAttrValue } from "../utils/astWalker";
import type { ParsedNode } from "../utils/htmlAst";

const EXEMPT = new Set(["hidden", "submit", "reset", "button", "image"]);
const MSG =
  "Campo sem label acessível. Associe um elemento label, ou use aria-label / aria-labelledby.";

export const inputLabelRule: A11yRule = {
  id: "input-missing-label",
  check(text, document, ast) {
    return ast ? checkAst(document, ast) : checkRegex(text, document);
  },
};

function checkAst(
  document: vscode.TextDocument,
  ast: ParsedNode,
): vscode.Diagnostic[] {
  // First pass: collect ids referenced by <label for/htmlFor>
  const labelledIds = new Set<string>();
  walkNodes(ast, (node) => {
    if (node.tagName?.toLowerCase() !== "label") return;
    const forVal = getAttrValue(node, "for") ?? getAttrValue(node, "htmlfor");
    if (forVal) labelledIds.add(forVal);
  });

  const diagnostics: vscode.Diagnostic[] = [];
  walkNodes(ast, (node) => {
    if (node.tagName?.toLowerCase() !== "input") return;
    const type = (getAttrValue(node, "type") ?? "").toLowerCase();
    if (EXEMPT.has(type)) return;
    if (hasAnyAttribute(node, "aria-label", "aria-labelledby", "title")) return;
    const id = getAttrValue(node, "id");
    if (id && labelledIds.has(id)) return;
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
  const labelledIds = new Set(
    [
      ...text.matchAll(
        /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*(["'])([^"']+)\1[^>]*>/gi,
      ),
    ].map((m) => m[2] ?? ""),
  );
  const EXEMPT_RX =
    /\btype\s*=\s*(["'])(?:hidden|submit|reset|button|image)\1/i;
  const accRx = /\b(?:aria-label|aria-labelledby|title)\s*=/i;
  const idRx = /\bid\s*=\s*(["'])([^"']+)\1/i;
  return [...text.matchAll(/<input\b([^>]*)>/gi)].flatMap((m) => {
    const attrs = m[1] ?? "";
    if (EXEMPT_RX.test(attrs) || accRx.test(attrs)) return [];
    const id = idRx.exec(attrs)?.[2];
    if (id && labelledIds.has(id)) return [];
    return [
      makeDiagnostic(
        document,
        m.index,
        m[0].length,
        MSG,
        vscode.DiagnosticSeverity.Warning,
      ),
    ];
  });
}
