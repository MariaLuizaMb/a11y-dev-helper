// src/rules/inputPlaceholderNoLabel.ts
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
 * Detects <input> elements that rely solely on placeholder as a label.
 * placeholder disappears on typing and is not reliably announced by screen readers.
 */
export const inputPlaceholderNoLabelRule: A11yRule = {
  id: "input-placeholder-no-label",
  check(text, document) {
    const ignoredInputTypes = new Set(["hidden", "submit", "reset", "button", "image"]);

    const root = parseDocument(text, document.languageId);
    const labelledInputIds = new Set<string>();
    const diagnostics: vscode.Diagnostic[] = [];

    const collectLabels = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "label") {
        const forValue = getAttr(node, "for") ?? getAttr(node, "htmlfor");
        if (forValue) {
          labelledInputIds.add(forValue);
        }
      }

      for (const child of node.children ?? []) {
        collectLabels(child);
      }
    };

    collectLabels(root);

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "input") {
        const inputType = getAttr(node, "type")?.toLowerCase();
        if (inputType && ignoredInputTypes.has(inputType)) {
          return;
        }

        const hasPlaceholder = getAttr(node, "placeholder") !== undefined;
        const hasAccessibleName = ["aria-label", "aria-labelledby", "title"].some((name) =>
          Boolean(getAttr(node, name)),
        );
        const inputId = getAttr(node, "id");

        if (hasPlaceholder && !hasAccessibleName && !(inputId && labelledInputIds.has(inputId))) {
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
              "Campo usando placeholder como único rótulo. O placeholder desaparece ao digitar e não substitui um <label> ou aria-label.",
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
