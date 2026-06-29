// src/rules/buttonOnlySvg.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  parseDocument,
  collectTextContent,
  hasParsedAttr,
  getNodeLocation,
  isElementNode,
  isParsedTextNode,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects <button> elements whose only content is an SVG with no accessible name.
 * Icon-only buttons must have aria-label, title, or visually-hidden text.
 * WCAG 4.1.2 Name, Role, Value (Level A)
 */
export const buttonOnlySvgRule: A11yRule = {
  id: "button-only-svg",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const isSvgOnly = (node: ParsedNode): boolean => {
      const children = node.children ?? [];
      if (children.length === 0) return false;
      const hasSvgChild = children.some(
        (c) => isElementNode(c) && c.tagName === "svg",
      );
      if (!hasSvgChild) return false;
      return children.every((c) => {
        if (isParsedTextNode(c)) return (c.value ?? "").trim().length === 0;
        if (isElementNode(c))
          return c.tagName === "svg" || c.tagName === "path";
        return false;
      });
    };

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "button") {
        const hasName =
          collectTextContent(node).trim().length > 0 ||
          ["aria-label", "aria-labelledby", "title"].some((a) =>
            hasParsedAttr(node, a),
          );
        if (!hasName && isSvgOnly(node)) {
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
              "Botão com apenas SVG sem nome acessível. Adicione aria-label, title ou texto visível.",
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
