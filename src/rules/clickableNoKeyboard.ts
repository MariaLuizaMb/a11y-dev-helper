// src/rules/clickableNoKeyboard.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  parseDocument,
  getAttr,
  getNodeLocation,
  isElementNode,
  type ParsedNode,
} from "../utils/htmlAst";

const INTERACTIVE = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
]);

/**
 * Detects non-interactive elements with onClick but without role or tabIndex,
 * making them unreachable by keyboard-only users.
 * WCAG 2.1.1 Keyboard (Level A)
 */
export const clickableNoKeyboardRule: A11yRule = {
  id: "clickable-no-keyboard-support",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && !INTERACTIVE.has(node.tagName ?? "")) {
        const hasClick = Boolean(
          getAttr(node, "onclick") ?? getAttr(node, "onClick"),
        );
        const hasTabIndex = Boolean(
          getAttr(node, "tabindex") ?? getAttr(node, "tabIndex"),
        );
        const hasRole = Boolean(getAttr(node, "role"));

        if (hasClick && !hasTabIndex && !hasRole) {
          const loc = getNodeLocation(node);
          diagnostics.push(
            new vscode.Diagnostic(
              loc
                ? new vscode.Range(
                    document.positionAt(loc.startOffset),
                    document.positionAt(loc.endOffset),
                  )
                : new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(0),
                  ),
              "Elemento clicável sem suporte ao teclado. Adicione role, tabIndex ou use um elemento semântico.",
              vscode.DiagnosticSeverity.Warning,
            ),
          );
        }
      }
      for (const child of node.children ?? []) visit(child);
    };

    visit(root);
    return diagnostics;
  },
};
