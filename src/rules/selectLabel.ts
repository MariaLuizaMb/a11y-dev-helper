// src/rules/selectLabel.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <select> elements without an accessible label.
 * Mirrors the same two-pass strategy used by inputLabel.ts.
 */
export const selectLabelRule: A11yRule = {
  id: "select-missing-label",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const labelledIds = new Set<string>();
    const diagnostics: vscode.Diagnostic[] = [];

    const collectLabels = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "label") {
        const forValue = getAttr(node, "for") ?? getAttr(node, "htmlfor");
        if (forValue) {
          labelledIds.add(forValue);
        }
      }

      for (const child of node.children ?? []) {
        collectLabels(child);
      }
    };

    collectLabels(root);

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "select") {
        const hasAccessibleName = ["aria-label", "aria-labelledby", "title"].some(
          (name) => Boolean(getAttr(node, name)),
        );
        const selectId = getAttr(node, "id");

        if (!hasAccessibleName && !(selectId && labelledIds.has(selectId))) {
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
              "Campo <select> sem label acessível. Associe um <label>, ou use aria-label / aria-labelledby.",
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
