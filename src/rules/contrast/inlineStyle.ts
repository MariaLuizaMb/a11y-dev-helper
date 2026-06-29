// src/rules/contrast/inlineStyle.ts
import * as vscode from "vscode";
import { makeDiagnostic } from "../../utils/diagnostics";
import {
  parseColor,
  evaluateContrast,
  formatContrastMessage,
} from "../../utils/colorContrast";
import { parseHtml, walkTree, getAttr, type ParsedNode } from "../../utils/htmlAst";

function isParse5Element(node: unknown): node is { tagName?: string; sourceCodeLocation?: { startOffset?: number; endOffset?: number } | null; attrs?: Array<{ name: string; value?: string }> } {
  return Boolean(node && typeof node === "object" && "tagName" in node);
}

const { parse: parseBabel } = require("@babel/parser") as {
  parse: (text: string, options: Record<string, unknown>) => any;
};

type ParsedStyleDeclarations = {
  fgRaw?: string;
  bgRaw?: string;
  source: string;
  start: number;
  end: number;
  declarations?: Map<string, string>;
};

function normalizePropertyName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  let result = "";
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const previous = trimmed[index - 1];
    const isUpperCase = char >= "A" && char <= "Z";
    const isLowerCasePrevious = Boolean(previous && previous >= "a" && previous <= "z");

    if (isUpperCase && isLowerCasePrevious) {
      result += "-";
    }

    result += char.toLowerCase();
  }

  return result;
}

function parseCssDeclarations(value: string): Map<string, string> {
  const declarations = new Map<string, string>();
  let currentProperty = "";
  let currentValue = "";
  let quote: string | null = null;
  let depth = 0;
  let seenColon = false;

  const flush = (): void => {
    const property = currentProperty.trim();
    const declarationValue = currentValue.trim();
    if (property && declarationValue) {
      declarations.set(normalizePropertyName(property), declarationValue);
    }
    currentProperty = "";
    currentValue = "";
    seenColon = false;
  };

  for (const char of value) {
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      if (seenColon) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      if (seenColon) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      if (seenColon) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === "}" || char === "]" || char === ")") {
      if (depth > 0) {
        depth -= 1;
      }
      if (seenColon) {
        currentValue += char;
      } else {
        currentProperty += char;
      }
      continue;
    }

    if (char === ":" && depth === 0 && !seenColon) {
      seenColon = true;
      continue;
    }

    if (char === ";" && depth === 0) {
      flush();
      continue;
    }

    if (seenColon) {
      currentValue += char;
    } else {
      currentProperty += char;
    }
  }

  if (currentProperty || currentValue) {
    flush();
  }

  return declarations;
}

function getNodeTextValue(node: unknown): string | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const current = node as Record<string, unknown>;
  if (typeof current.value === "string") {
    return current.value;
  }

  if (current.type === "TemplateLiteral" && Array.isArray(current.quasis)) {
    const first = current.quasis[0] as { value?: { cooked?: string } } | undefined;
    return first?.value?.cooked ?? null;
  }

  if (current.type === "Identifier" && typeof current.name === "string") {
    return current.name;
  }

  if (current.type === "JSXExpressionContainer") {
    return getNodeTextValue(current.expression);
  }

  return null;
}

function getStyleDeclarations(node: unknown): Map<string, string> | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const current = node as Record<string, unknown>;

  if (current.type === "StringLiteral" || current.type === "Literal") {
    const value = getNodeTextValue(current);
    return value ? parseCssDeclarations(value) : null;
  }

  if (current.type === "TemplateLiteral") {
    return parseCssDeclarations(getNodeTextValue(current) ?? "");
  }

  if (current.type === "ObjectExpression") {
    const declarations = new Map<string, string>();
    const properties = Array.isArray(current.properties) ? current.properties : [];

    for (const property of properties) {
      const propertyNode = property as Record<string, unknown>;
      if (propertyNode.type !== "ObjectProperty") {
        continue;
      }

      const key = propertyNode.key as Record<string, unknown> | undefined;
      const propertyName =
        typeof key?.name === "string"
          ? key.name
          : typeof key?.value === "string"
            ? key.value
            : "";
      const valueNode = propertyNode.value as Record<string, unknown> | undefined;
      const rawValue = getNodeTextValue(valueNode);
      if (propertyName && rawValue) {
        declarations.set(normalizePropertyName(propertyName), rawValue);
      }
    }

    return declarations;
  }

  if (current.type === "JSXExpressionContainer") {
    return getStyleDeclarations(current.expression);
  }

  return null;
}

function buildStyleDiagnostic(
  document: vscode.TextDocument,
  data: ParsedStyleDeclarations,
  declarations: Map<string, string> = parseCssDeclarations(data.source),
): vscode.Diagnostic | null {
  const fgRaw = declarations.get("color");
  const bgRaw = declarations.get("background-color") ?? declarations.get("background");

  if (!fgRaw || !bgRaw) {
    return null;
  }

  const fg = parseColor(fgRaw);
  const bg = parseColor(bgRaw);

  if (!fg || !bg) {
    return null;
  }

  const result = evaluateContrast(fg, bg, "normal");
  if (result.passesAAA) {
    return null;
  }

  return makeDiagnostic(
    document,
    data.start,
    data.end - data.start,
    formatContrastMessage(result, `estilo inline (color: ${fgRaw}, background: ${bgRaw})`),
    result.passesAA
      ? vscode.DiagnosticSeverity.Information
      : vscode.DiagnosticSeverity.Warning,
  );
}

/**
 * Checks colour contrast for inline style attributes.
 *
 * Detects pairs where both color and background-color/background are specified
 * in the same style attribute or JSX style prop.
 */
export function checkInlineStyles(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  const htmlRoot = parseHtml(text);
  walkTree(htmlRoot, (node) => {
    if (!isParse5Element(node) || !node.tagName) {
      return;
    }

    const styleValue = getAttr(node as ParsedNode, "style");
    if (!styleValue) {
      return;
    }

    const loc = node.sourceCodeLocation;
    const start = loc?.startOffset ?? 0;
    const end = loc?.endOffset ?? start;
    const diagnostic = buildStyleDiagnostic(document, {
      source: styleValue,
      start,
      end,
    });

    if (diagnostic) {
      diagnostics.push(diagnostic);
    }
  });

  if (document.languageId !== "html") {
    const babelAst = parseBabel(text, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    });

    const visit = (node: unknown): void => {
      if (!node || typeof node !== "object") {
        return;
      }

      const current = node as Record<string, unknown>;
      if (current.type === "JSXAttribute") {
        const nameNode = current.name as Record<string, unknown> | undefined;
        if (nameNode?.type === "JSXIdentifier" && nameNode.name === "style") {
          const valueNode = current.value as Record<string, unknown> | undefined;
          const declarations = getStyleDeclarations(valueNode);
          if (!declarations) {
            return;
          }

          const start = typeof current.start === "number" ? current.start : 0;
          const end = typeof current.end === "number" ? current.end : start;
          const diagnostic = buildStyleDiagnostic(document, {
            source: "",
            start,
            end,
            declarations,
          }, declarations);

          if (diagnostic) {
            diagnostics.push(diagnostic);
          }
        }
      }

      for (const value of Object.values(current)) {
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            for (const child of value) {
              visit(child);
            }
          } else {
            visit(value);
          }
        }
      }
    };

    visit(babelAst.program);
  }

  return diagnostics;
}
