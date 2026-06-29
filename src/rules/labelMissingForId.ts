// src/rules/labelMissingForId.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  parseDocument,
  getAttr,
  getNodeLocation,
  isElementNode,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <label for="x"> elements where no element with id="x" exists in the document.
 * A dangling for attribute means the label has no effect on keyboard/AT focus.
 * WCAG 1.3.1 Info and Relationships (Level A)
 */
export const labelMissingForIdRule: A11yRule = {
  id: "label-missing-for-id",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const ids = new Set<string>();
    const diagnostics: vscode.Diagnostic[] = [];

    const collectIds = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const id = getAttr(node, "id");
        if (id) ids.add(id);
      }
      for (const child of node.children ?? []) collectIds(child);
    };
    collectIds(root);

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "label") {
        const forValue = getAttr(node, "for") ?? getAttr(node, "htmlfor");
        if (forValue && !ids.has(forValue)) {
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
              `O label referencia o id inexistente "${forValue}".`,
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
