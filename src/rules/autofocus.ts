// src/rules/autofocus.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/** Detects autofocus/autoFocus usage. */
export const autofocusRule: A11yRule = {
  id: "autofocus",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && (getAttr(node, "autofocus") !== undefined || getAttr(node, "autoFocus") !== undefined)) {
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
            "O uso de autofocus pode prejudicar a navegação de usuários de teclado e leitores de tela. Use com cuidado.",
            vscode.DiagnosticSeverity.Information,
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
