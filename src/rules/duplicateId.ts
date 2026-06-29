// src/rules/duplicateId.ts
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
 * Detects elements sharing the same id attribute value.
 * Duplicate ids break aria-labelledby, aria-describedby, and label[for] associations.
 * WCAG 4.1.1 Parsing (Level A)
 */
export const duplicateIdRule: A11yRule = {
  id: "duplicate-id",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const seen = new Map<string, ParsedNode>();
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const id = getAttr(node, "id");
        if (id) {
          if (seen.has(id)) {
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
                `O id "${id}" está duplicado. Cada id deve ser único na página.`,
                vscode.DiagnosticSeverity.Warning,
              ),
            );
          } else {
            seen.set(id, node);
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    };

    visit(root);
    return diagnostics;
  },
};
