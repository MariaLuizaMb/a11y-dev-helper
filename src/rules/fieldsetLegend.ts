// src/rules/fieldsetLegend.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getNodeLocation,
  hasParsedAttr,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <fieldset> elements that do not contain a <legend> child.
 *
 * A <legend> provides a caption for the group of controls inside the fieldset,
 * which screen readers announce before each field in the group. Without it,
 * the relationship between the fields is not conveyed to assistive technologies.
 */
export const fieldsetLegendRule: A11yRule = {
  id: "fieldset-missing-legend",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const containsLegend = (node: ParsedNode): boolean => {
      for (const child of node.children ?? []) {
        if (isElementNode(child) && child.tagName === "legend") {
          return true;
        }

        if (isElementNode(child) && child.tagName === "fieldset") {
          continue;
        }

        if (containsLegend(child)) {
          return true;
        }
      }

      return false;
    };

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "fieldset") {
        const hasAccessibleName = hasParsedAttr(node, "aria-label") || hasParsedAttr(node, "aria-labelledby");

        if (!hasAccessibleName && !containsLegend(node)) {
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
              "<fieldset> sem <legend>. Adicione um <legend> para descrever o grupo de campos — leitores de tela anunciam o legend antes de cada campo dentro do fieldset.",
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
