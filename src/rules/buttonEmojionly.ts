// src/rules/buttonEmojionly.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  collectTextContent,
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

function isEmojiOnlyText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  for (const char of Array.from(trimmed)) {
    const codePoint = char.codePointAt(0) ?? 0;
    const isEmoji =
      (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
      (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
      (codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff) ||
      codePoint === 0x200d ||
      codePoint === 0x20e3 ||
      codePoint === 0xfe0f;

    if (!isEmoji) {
      return false;
    }
  }

  return true;
}

/** Detects buttons whose only visible content is one or more emoji, which screen readers announce inconsistently. */
export const buttonEmojiOnlyRule: A11yRule = {
  id: "button-emoji-only",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "button") {
        const hasAccessibleName = ["aria-label", "aria-labelledby", "title"].some((name) =>
          Boolean(getAttr(node, name)),
        );
        const visibleText = collectTextContent(node).trim();

        if (!hasAccessibleName && visibleText.length > 0 && isEmojiOnlyText(visibleText)) {
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
              "Botão contém apenas emoji. Leitores de tela anunciam emoji de forma inconsistente. Adicione aria-label ou title com uma descrição textual.",
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
