// src/rules/iframeTitle.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <iframe> elements without a non-empty title attribute.
 *
 * The check uses the normalized AST for HTML, JSX and TSX documents.
 * WCAG 4.1.2 Name, Role, Value (Level A)
 */
export const iframeTitleRule: A11yRule = {
  id: "iframe-missing-title",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "iframe") {
        const titleValue = getAttr(node, "title")?.trim();
        if (titleValue) {
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
            "iframe sem atributo title. Adicione um title descritivo para que leitores de tela identifiquem o conteúdo do frame.",
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
