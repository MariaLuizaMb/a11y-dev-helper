// src/rules/linkNoHref.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getNodeLocation,
  hasParsedAttr,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/** Detects <a> elements without an href attribute, which are not keyboard-focusable by default. */
export const linkNoHrefRule: A11yRule = {
  id: "link-missing-href",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "a" && !hasParsedAttr(node, "href")) {
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
            "Link sem atributo href. Sem href, o elemento não é focável pelo teclado. Use um <button> para ações ou adicione um href válido.",
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
