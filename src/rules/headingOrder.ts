// src/rules/headingOrder.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects heading levels that skip ranks (e.g. h1 → h3), breaking
 * the logical document structure required by screen readers.
 *
 * The check walks the normalized AST so document order and nesting are handled
 * without regex-based matching.
 *
 * WCAG 1.3.1 Info and Relationships (Level A)
 * WCAG 2.4.6 Headings and Labels (Level AA)
 */
export const headingOrderRule: A11yRule = {
  id: "heading-order",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    let previousLevel = 0;

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName.startsWith("h") && node.tagName.length === 2) {
        const levelChar = node.tagName[1];
        const currentLevel = Number.parseInt(levelChar, 10);
        if (Number.isNaN(currentLevel)) {
          for (const child of node.children ?? []) {
            visit(child);
          }
          return;
        }

        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
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
              `Hierarquia de headings incorreta: h${previousLevel} seguido de h${currentLevel}. Não pule níveis de heading.`,
              vscode.DiagnosticSeverity.Warning,
            ),
          );
        }

        previousLevel = currentLevel;
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    };

    visit(root);
    return diagnostics;
  },
};
