// src/rules/tabIndexPositive.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/** Detects elements with tabIndex/tabindex greater than 0, which disrupts natural tab order. */
export const tabIndexPositiveRule: A11yRule = {
  id: "tabindex-positive",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const value = getAttr(node, "tabindex");
        const parsedValue = value !== undefined ? Number.parseInt(value, 10) : Number.NaN;

        if (!Number.isNaN(parsedValue) && parsedValue > 0) {
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
              "tabIndex com valor positivo altera a ordem natural de foco e pode confundir usuários de teclado. Prefira tabIndex={0} ou tabIndex={-1}.",
              vscode.DiagnosticSeverity.Warning,
            ),
          );
        }
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    };

    visit(root);
    return diagnostics;
  },
};
