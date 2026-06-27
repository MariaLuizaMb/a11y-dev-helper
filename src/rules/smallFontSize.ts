// src/rules/smallFontSize.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import { getLocRange, parseBabelAst, parseHtml, walkTree, isElement } from "../utils/htmlAst";

/**
 * Detects font-size declarations smaller than 12px using AST-based parsing.
 */
export const smallFontSizeRule: A11yRule = {
  id: "small-font-size",
  check(text, document) {
    const MIN_PX = 12;
    const BASE_REM_PX = 16;
    const PT_TO_PX = 1.3333;
    const diagnostics: vscode.Diagnostic[] = [];

    if (document.languageId === "html") {
      const tree = parseHtml(text);
      walkTree(tree, (node) => {
        if (!isElement(node)) {
          return;
        }

        const styleAttr = node.attrs.find((attribute) => attribute.name === "style");
        if (!styleAttr?.value) {
          return;
        }

        const declarations = parseStyleDeclarations(styleAttr.value);
        const fontSize = declarations["font-size"] ?? declarations.fontSize;
        if (!fontSize) {
          return;
        }

        const px = toPxValue(fontSize, BASE_REM_PX, PT_TO_PX);
        if (px !== null && px < MIN_PX) {
          const range = getLocRange(document, node as unknown as { loc?: { start: { line: number; column: number }; end: { line: number; column: number } } });
          diagnostics.push(
            makeDiagnostic(
              document,
              document.offsetAt(range.start),
              document.offsetAt(range.end) - document.offsetAt(range.start),
              `font-size de ${fontSize} (≈${px.toFixed(1)}px) pode ser ilegível. Prefira no mínimo 12px para texto de conteúdo.`,
              vscode.DiagnosticSeverity.Warning,
            ),
          );
        }
      });

      return diagnostics;
    }

    try {
      const ast = parseBabelAst(text);
      const visit = (node: any) => {
        if (!node || typeof node !== "object") {
          return;
        }

        if (node.type === "JSXAttribute") {
          const attrName = node.name?.name;
          const valueNode = node.value;

          if (attrName === "style") {
            const attrValue = extractStyleValue(valueNode);
            if (attrValue) {
              const declarations = parseStyleDeclarations(attrValue);
              const fontSize = declarations["font-size"] ?? declarations.fontSize;
              if (fontSize) {
                const px = toPxValue(fontSize, BASE_REM_PX, PT_TO_PX);
                if (px !== null && px < MIN_PX) {
                  const range = getLocRange(document, node);
                  diagnostics.push(
                    makeDiagnostic(
                      document,
                      document.offsetAt(range.start),
                      document.offsetAt(range.end) - document.offsetAt(range.start),
                      `font-size de ${fontSize} (≈${px.toFixed(1)}px) pode ser ilegível. Prefira no mínimo 12px para texto de conteúdo.`,
                      vscode.DiagnosticSeverity.Warning,
                    ),
                  );
                }
              }
            }
          }

          if (attrName === "sx") {
            const objectExpression = valueNode?.expression;
            if (objectExpression?.type === "ObjectExpression") {
              for (const property of objectExpression.properties ?? []) {
                if (property.type !== "ObjectProperty") {
                  continue;
                }

                const propertyName = property.key?.name ?? property.key?.value;
                if (propertyName !== "fontSize") {
                  continue;
                }

                const sizeValue = extractStaticValue(property.value);
                if (!sizeValue) {
                  continue;
                }

                const px = toPxValue(sizeValue, BASE_REM_PX, PT_TO_PX);
                if (px !== null && px < MIN_PX) {
                  const range = getLocRange(document, property);
                  diagnostics.push(
                    makeDiagnostic(
                      document,
                      document.offsetAt(range.start),
                      document.offsetAt(range.end) - document.offsetAt(range.start),
                      `fontSize: ${sizeValue} (equivalente a ${px.toFixed(1)}px em MUI/Emotion) pode ser ilegível. Prefira no mínimo 12px para texto de conteúdo.`,
                      vscode.DiagnosticSeverity.Warning,
                    ),
                  );
                }
              }
            }
          }
        }

        for (const child of Object.values(node)) {
          if (child && typeof child === "object") {
            visit(child);
          }
        }
      };

      visit(ast.program);
    } catch {
      return [];
    }

    return diagnostics;
  },
};

function extractStyleValue(valueNode: any): string | undefined {
  if (!valueNode || typeof valueNode !== "object") {
    return undefined;
  }

  if (valueNode.type === "StringLiteral") {
    return valueNode.value;
  }

  if (valueNode.type === "JSXExpressionContainer") {
    return extractStyleValue(valueNode.expression);
  }

  if (valueNode.type === "ObjectExpression") {
    return undefined;
  }

  return undefined;
}

function extractStaticValue(valueNode: any): string | undefined {
  if (!valueNode || typeof valueNode !== "object") {
    return undefined;
  }

  if (valueNode.type === "StringLiteral") {
    return valueNode.value;
  }

  if (valueNode.type === "NumericLiteral") {
    return String(valueNode.value);
  }

  if (valueNode.type === "TemplateLiteral" && valueNode.expressions.length === 0) {
    return valueNode.quasis[0]?.value?.cooked;
  }

  if (valueNode.type === "JSXExpressionContainer") {
    return extractStaticValue(valueNode.expression);
  }

  return undefined;
}

function parseStyleDeclarations(styleValue: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  let currentProperty = "";
  let currentValue = "";
  let colonSeen = false;
  let inString = false;
  let quoteChar = "";

  const flush = () => {
    const propertyName = currentProperty.trim().toLowerCase();
    const value = currentValue.trim();
    if (propertyName) {
      declarations[propertyName] = value;
    }

    currentProperty = "";
    currentValue = "";
    colonSeen = false;
  };

  for (const char of styleValue) {
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

    if (char === ";") {
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

function toPxValue(input: string, baseRemPx: number, ptToPx: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let numberPart = "";
  let index = 0;
  while (index < trimmed.length) {
    const char = trimmed[index];
    if (char === "." || (char >= "0" && char <= "9")) {
      numberPart += char;
      index += 1;
      continue;
    }

    break;
  }

  if (!numberPart) {
    return null;
  }

  const value = Number(numberPart);
  const unit = trimmed.slice(index).trim().toLowerCase();

  if (unit === "" || unit === "px") {
    return value;
  }

  if (unit === "pt") {
    return value * ptToPx;
  }

  if (unit === "rem" || unit === "em") {
    return value * baseRemPx;
  }

  return null;
}
