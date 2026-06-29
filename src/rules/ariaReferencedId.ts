// src/rules/ariaReferencedId.ts
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
 * Detects aria-labelledby and aria-describedby attributes that reference
 * id values which do not exist in the document.
 * WCAG 4.1.2 Name, Role, Value (Level A)
 */
export const ariaReferencedIdRule: A11yRule = {
  id: "aria-referenced-id",
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
      if (isElementNode(node)) {
        for (const attrName of ["aria-labelledby", "aria-describedby"]) {
          const value = getAttr(node, attrName);
          if (!value) continue;
          for (const id of value.trim().split(/\s+/)) {
            if (id && !ids.has(id)) {
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
                  `O atributo ${attrName} referencia o id inexistente "${id}".`,
                  vscode.DiagnosticSeverity.Warning,
                ),
              );
            }
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    };

    visit(root);
    return diagnostics;
  },
};
