// src/rules/htmlLang.ts
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
 * Detects <html> elements without a lang attribute.
 *
 * The rule works from the normalized AST for HTML, JSX and TSX documents.
 *
 * WCAG 3.1.1 Language of Page (Level A)
 */
export const htmlLangRule: A11yRule = {
  id: "html-missing-lang",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "html" && !hasParsedAttr(node, "lang")) {
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
            'A tag <html> não possui atributo lang. Defina o idioma principal da página, como lang="pt-BR".',
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    };

    visit(root);
    return diagnostics;
  },
};
