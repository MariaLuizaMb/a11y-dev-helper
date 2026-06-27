// src/rules/linkText.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  collectTextContent,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

function normalizeWhitespace(value: string): string {
  let result = "";
  let previousWasWhitespace = false;

  for (const char of value) {
    const isWhitespace = char === " " || char === "\n" || char === "\r" || char === "\t";
    if (!isWhitespace) {
      result += char;
      previousWasWhitespace = false;
      continue;
    }

    if (!previousWasWhitespace) {
      result += " ";
      previousWasWhitespace = true;
    }
  }

  return result.trim();
}

/** Detects links whose visible text is too generic to describe the destination. */
export const linkTextRule: A11yRule = {
  id: "link-generic-text",
  check(text, document) {
    const genericTexts = new Set([
      "clique aqui",
      "saiba mais",
      "leia mais",
      "click here",
      "read more",
      "more",
    ]);

    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "a") {
        const innerText = normalizeWhitespace(collectTextContent(node)).toLowerCase();

        if (genericTexts.has(innerText)) {
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
              "Texto de link genérico. Use um texto que descreva melhor o destino ou a ação.",
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
