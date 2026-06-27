// src/rules/tableCaption.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  hasParsedAttr,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <table> elements without a <caption> child or accessible name attribute.
 *
 * The rule traverses the normalized AST for HTML, JSX and TSX documents.
 *
 * WCAG 1.3.1 Info and Relationships (Level A)
 */
export const tableCaptionRule: A11yRule = {
  id: "table-missing-caption",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "table") {
        const hasAccessibleName = ["aria-label", "aria-labelledby", "summary"].some((name) =>
          hasParsedAttr(node, name),
        );
        const hasCaption = (node.children ?? []).some(
          (child) => isElementNode(child) && child.tagName === "caption",
        );

        if (hasAccessibleName || hasCaption) {
          for (const child of node.children ?? []) {
            visit(child);
          }
          return;
        }

        const loc = getNodeLocation(node);
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
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    };

    visit(root);
    return diagnostics;
  },
};
