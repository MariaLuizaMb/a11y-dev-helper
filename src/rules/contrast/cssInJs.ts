// src/rules/contrast/cssInJs.ts
import * as vscode from "vscode";
import { makeDiagnostic } from "../../utils/diagnostics";
import {
  parseColor,
  evaluateContrast,
  formatContrastMessage,
} from "../../utils/colorContrast";
import { parseBabelAst, getLocRange } from "../../utils/htmlAst";

/**
 * Checks colour contrast inside CSS-in-JS patterns using the Babel AST.
 */
function extractAndEvaluate(
  fgRaw: string,
  bgRaw: string,
  document: vscode.TextDocument,
  startIndex: number,
  endIndex: number,
  source: string,
): vscode.Diagnostic | null {
  const fg = parseColor(fgRaw.trim());
  const bg = parseColor(bgRaw.trim());

  if (!fg || !bg) {
    return null;
  }

  const result = evaluateContrast(fg, bg, "normal");

  if (result.passesAAA) {
    return null;
  }

  return makeDiagnostic(
    document,
    startIndex,
    endIndex - startIndex,
    formatContrastMessage(result, source),
    result.passesAA
      ? vscode.DiagnosticSeverity.Information
      : vscode.DiagnosticSeverity.Warning,
  );
}

function getStaticString(node: any): string | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }

  if (node.type === "StringLiteral") {
    return typeof node.value === "string" ? node.value : undefined;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked;
  }

  if (node.type === "JSXExpressionContainer") {
    return getStaticString(node.expression);
  }

  return undefined;
}

function getPropertyName(node: any): string | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "StringLiteral") {
    return typeof node.value === "string" ? node.value : undefined;
  }

  return undefined;
}

function extractColorPairFromObjectExpression(objectExpression: any): { fg?: string; bg?: string } | null {
  let fg: string | undefined;
  let bg: string | undefined;

  for (const property of objectExpression?.properties ?? []) {
    if (property.type !== "ObjectProperty") {
      continue;
    }

    const propertyName = getPropertyName(property.key);
    const value = getStaticString(property.value);

    if (!value) {
      continue;
    }

    if (propertyName === "color") {
      fg = value;
    } else if (propertyName === "backgroundColor" || propertyName === "background") {
      bg = value;
    }
  }

  return fg && bg ? { fg, bg } : null;
}

function parseCssDeclarations(cssText: string): { color?: string; background?: string } {
  const declarations: { color?: string; background?: string } = {};
  let currentProperty = "";
  let currentValue = "";
  let inString = false;
  let quoteChar = "";
  let colonSeen = false;

  const flush = () => {
    const propertyName = currentProperty.trim().toLowerCase();
    const value = currentValue.trim();

    if (propertyName === "color") {
      declarations.color = value;
    } else if (propertyName === "background" || propertyName === "background-color") {
      declarations.background = value;
    }

    currentProperty = "";
    currentValue = "";
    colonSeen = false;
  };

  for (const char of cssText) {
    if (inString) {
      if (char === quoteChar) {
        inString = false;
        quoteChar = "";
      }
      if (!colonSeen) {
        currentProperty += char;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      if (!colonSeen) {
        currentProperty += char;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === ":" && !colonSeen) {
      colonSeen = true;
      continue;
    }

    if (char === ";" && !inString) {
      flush();
      continue;
    }

    if (!colonSeen) {
      currentProperty += char;
    } else {
      currentValue += char;
    }
  }

  if (currentProperty || currentValue) {
    flush();
  }

  return declarations;
}

export function checkCssInJs(
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

      if (node.type === "JSXAttribute") {
        const attrName = node.name?.name;
        const expression = node.value?.expression;

        if (attrName === "sx" && expression?.type === "ObjectExpression") {
          const pair = extractColorPairFromObjectExpression(expression);
          if (pair?.fg && pair.bg) {
            const range = getLocRange(document, node);
            const diag = extractAndEvaluate(
              pair.fg,
              pair.bg,
              document,
              document.offsetAt(range.start),
              document.offsetAt(range.end),
              `sx prop (color: ${pair.fg}, background: ${pair.bg})`,
            );
            if (diag) {
              diagnostics.push(diag);
            }
          }
        }

      }

      if (node.type === "TaggedTemplateExpression") {
        const tagName = node.tag?.type === "MemberExpression" ? node.tag.object?.name : undefined;
        const template = node.quasi?.quasis?.[0]?.value?.cooked;
        if (tagName === "styled" && typeof template === "string") {
          const declarations = parseCssDeclarations(template);
          if (declarations.color && declarations.background) {
            const range = getLocRange(document, node);
            const diag = extractAndEvaluate(
              declarations.color,
              declarations.background,
              document,
              document.offsetAt(range.start),
              document.offsetAt(range.end),
              `styled-component (color: ${declarations.color}, background: ${declarations.background})`,
            );
            if (diag) {
              diagnostics.push(diag);
            }
          }
        }
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === "object" && Array.isArray(value)) {
          for (const child of value) {
            visit(child);
          }
        } else if (value && typeof value === "object") {
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
