// src/rules/videoTrack.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  attr,
  openingTagLocation,
  isElement,
  parseBabelAst,
  getLocRange,
} from "../utils/htmlAst";

/**
 * Detects <video> elements without a <track kind="captions"> or
 * <track kind="subtitles"> child element.
 *
 * Uses parse5 for HTML files and Babel for JSX/TSX so nested markup is analysed
 * without relying on regex.
 *
 * WCAG 1.2.2 Captions (Prerecorded) (Level A)
 */
export const videoTrackRule: A11yRule = {
  id: "video-missing-track",
  check(text, document) {
    if (document.languageId === "html") {
      return checkWithAst(text, document);
    }
    return checkWithParser(text, document);
  },
};

function checkWithAst(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const tree = parseHtml(text);

  walkTree(tree, (node) => {
    if (node.tagName !== "video") {
      return;
    }

    let hasCaptionTrack = false;

    walkTree(node, (child) => {
      if (child.tagName !== "track") {
        return;
      }
      const kind = attr(child, "kind")?.toLowerCase();
      if (kind === "captions" || kind === "subtitles") {
        hasCaptionTrack = true;
      }
    });

    if (hasCaptionTrack) {
      return;
    }

    const loc = openingTagLocation(node);
    const range = loc
      ? new vscode.Range(
          document.positionAt(loc.startOffset),
          document.positionAt(loc.endOffset),
        )
      : new vscode.Range(document.positionAt(0), document.positionAt(0));

    diagnostics.push(
      new vscode.Diagnostic(
        range,
        'Vídeo sem legenda. Adicione um elemento <track kind="captions"> ou <track kind="subtitles"> para tornar o conteúdo acessível a pessoas surdas ou com dificuldade auditiva.',
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  });

  return diagnostics;
}

function checkWithParser(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  try {
    const ast = parseBabelAst(text);

    const visit = (node: any) => {
      if (!node || typeof node !== "object") {
        return;
      }

      if (node.type === "JSXElement") {
        const elementName = node.openingElement?.name?.type === "JSXIdentifier"
          ? node.openingElement.name.name
          : undefined;

        if (elementName === "video") {
          let hasCaptionTrack = false;
          const visitChildren = (child: any) => {
            if (!child || typeof child !== "object") {
              return;
            }

            if (child.type === "JSXElement") {
              const childName = child.openingElement?.name?.type === "JSXIdentifier"
                ? child.openingElement.name.name
                : undefined;
              if (childName === "track") {
                const kind = readAttributeValue(child, "kind");
                if (kind === "captions" || kind === "subtitles") {
                  hasCaptionTrack = true;
                  return;
                }
              }
            }

            for (const value of Object.values(child)) {
              if (value && typeof value === "object") {
                visitChildren(value);
              }
            }
          };

          for (const child of node.children ?? []) {
            visitChildren(child);
          }

          if (!hasCaptionTrack) {
            const range = getLocRange(document, node.openingElement);
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                'Vídeo sem legenda. Adicione um elemento <track kind="captions"> ou <track kind="subtitles"> para tornar o conteúdo acessível a pessoas surdas ou com dificuldade auditiva.',
                vscode.DiagnosticSeverity.Warning,
              ),
            );
          }
        }
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === "object") {
          visit(value);
        }
      }
    };

    visit(ast.program);
  } catch {
    return [];
  }

  return diagnostics;
}

function readAttributeValue(node: any, attributeName: string): string | undefined {
  for (const attribute of node.openingElement?.attributes ?? []) {
    if (attribute.name?.type !== "JSXIdentifier" || attribute.name.name !== attributeName) {
      continue;
    }

    if (attribute.value?.type === "StringLiteral") {
      return attribute.value.value;
    }

    if (attribute.value?.type === "JSXExpressionContainer") {
      const expression = attribute.value.expression;
      if (expression?.type === "StringLiteral") {
        return expression.value;
      }
      if (expression?.type === "TemplateLiteral" && expression.expressions.length === 0) {
        return expression.quasis[0]?.value?.cooked;
      }
    }
  }

  return undefined;
}
