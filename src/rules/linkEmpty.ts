// src/rules/linkEmpty.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  parseDocument,
  collectTextContent,
  hasParsedAttr,
  getAttr,
  getNodeLocation,
  isElementNode,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <a href> elements with no visible text and no accessible name.
 * Empty links are unusable for screen reader and keyboard users.
 * WCAG 2.4.4 Link Purpose (Level A)
 */
export const linkEmptyRule: A11yRule = {
  id: "link-empty",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "a") {
        const hasHref = Boolean(getAttr(node, "href"));
        const hasName =
          collectTextContent(node).trim().length > 0 ||
          ["aria-label", "aria-labelledby", "title"].some((a) =>
            hasParsedAttr(node, a),
          );
        if (hasHref && !hasName) {
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
              "Link vazio. Adicione texto visível ou um nome acessível para descrever o destino.",
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
