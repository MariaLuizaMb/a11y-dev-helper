// src/rules/contrast/tailwindClasses.ts
import * as vscode from "vscode";
import { makeDiagnostic } from "../../utils/diagnostics";
import {
  RGB,
  evaluateContrast,
  formatContrastMessage,
  parseColor,
} from "../../utils/colorContrast";
import {
  getLocRange,
  parseBabelAst,
  parseHtml,
  walkTree,
  isElement,
  attr,
} from "../../utils/htmlAst";

/**
 * Tailwind CSS v3 colour palette.
 * Maps utility class colour tokens to their RGB values.
 *
 * NOTE: This covers the default Tailwind palette only.
 * Custom colours defined in tailwind.config.js cannot be resolved statically.
 * Replace with a config-aware resolver for complete coverage.
 */
const TAILWIND_COLORS: Record<string, RGB> = {
  // Slate
  "slate-50": { r: 248, g: 250, b: 252 },
  "slate-100": { r: 241, g: 245, b: 249 },
  "slate-200": { r: 226, g: 232, b: 240 },
  "slate-300": { r: 203, g: 213, b: 225 },
  "slate-400": { r: 148, g: 163, b: 184 },
  "slate-500": { r: 100, g: 116, b: 139 },
  "slate-600": { r: 71, g: 85, b: 105 },
  "slate-700": { r: 51, g: 65, b: 85 },
  "slate-800": { r: 30, g: 41, b: 59 },
  "slate-900": { r: 15, g: 23, b: 42 },
  "slate-950": { r: 2, g: 6, b: 23 },
  // Gray
  "gray-50": { r: 249, g: 250, b: 251 },
  "gray-100": { r: 243, g: 244, b: 246 },
  "gray-200": { r: 229, g: 231, b: 235 },
  "gray-300": { r: 209, g: 213, b: 219 },
  "gray-400": { r: 156, g: 163, b: 175 },
  "gray-500": { r: 107, g: 114, b: 128 },
  "gray-600": { r: 75, g: 85, b: 99 },
  "gray-700": { r: 55, g: 65, b: 81 },
  "gray-800": { r: 31, g: 41, b: 55 },
  "gray-900": { r: 17, g: 24, b: 39 },
  "gray-950": { r: 3, g: 7, b: 18 },
  // Zinc
  "zinc-50": { r: 250, g: 250, b: 250 },
  "zinc-100": { r: 244, g: 244, b: 245 },
  "zinc-200": { r: 228, g: 228, b: 231 },
  "zinc-300": { r: 212, g: 212, b: 216 },
  "zinc-400": { r: 161, g: 161, b: 170 },
  "zinc-500": { r: 113, g: 113, b: 122 },
  "zinc-600": { r: 82, g: 82, b: 91 },
  "zinc-700": { r: 63, g: 63, b: 70 },
  "zinc-800": { r: 39, g: 39, b: 42 },
  "zinc-900": { r: 24, g: 24, b: 27 },
  "zinc-950": { r: 9, g: 9, b: 11 },
  // Red
  "red-50": { r: 254, g: 242, b: 242 },
  "red-100": { r: 254, g: 226, b: 226 },
  "red-200": { r: 254, g: 202, b: 202 },
  "red-300": { r: 252, g: 165, b: 165 },
  "red-400": { r: 248, g: 113, b: 113 },
  "red-500": { r: 239, g: 68, b: 68 },
  "red-600": { r: 220, g: 38, b: 38 },
  "red-700": { r: 185, g: 28, b: 28 },
  "red-800": { r: 153, g: 27, b: 27 },
  "red-900": { r: 127, g: 29, b: 29 },
  "red-950": { r: 69, g: 10, b: 10 },
  // Orange
  "orange-50": { r: 255, g: 247, b: 237 },
  "orange-100": { r: 255, g: 237, b: 213 },
  "orange-200": { r: 254, g: 215, b: 170 },
  "orange-300": { r: 253, g: 186, b: 116 },
  "orange-400": { r: 251, g: 146, b: 60 },
  "orange-500": { r: 249, g: 115, b: 22 },
  "orange-600": { r: 234, g: 88, b: 12 },
  "orange-700": { r: 194, g: 65, b: 12 },
  "orange-800": { r: 154, g: 52, b: 18 },
  "orange-900": { r: 124, g: 45, b: 18 },
  "orange-950": { r: 67, g: 20, b: 7 },
  // Amber
  "amber-50": { r: 255, g: 251, b: 235 },
  "amber-100": { r: 254, g: 243, b: 199 },
  "amber-200": { r: 253, g: 230, b: 138 },
  "amber-300": { r: 252, g: 211, b: 77 },
  "amber-400": { r: 251, g: 191, b: 36 },
  "amber-500": { r: 245, g: 158, b: 11 },
  "amber-600": { r: 217, g: 119, b: 6 },
  "amber-700": { r: 180, g: 83, b: 9 },
  "amber-800": { r: 146, g: 64, b: 14 },
  "amber-900": { r: 120, g: 53, b: 15 },
  "amber-950": { r: 69, g: 26, b: 3 },
  // Yellow
  "yellow-50": { r: 254, g: 252, b: 232 },
  "yellow-100": { r: 254, g: 249, b: 195 },
  "yellow-200": { r: 254, g: 240, b: 138 },
  "yellow-300": { r: 253, g: 224, b: 71 },
  "yellow-400": { r: 250, g: 204, b: 21 },
  "yellow-500": { r: 234, g: 179, b: 8 },
  "yellow-600": { r: 202, g: 138, b: 4 },
  "yellow-700": { r: 161, g: 98, b: 7 },
  "yellow-800": { r: 133, g: 77, b: 14 },
  "yellow-900": { r: 113, g: 63, b: 18 },
  "yellow-950": { r: 66, g: 32, b: 6 },
  // Green
  "green-50": { r: 240, g: 253, b: 244 },
  "green-100": { r: 220, g: 252, b: 231 },
  "green-200": { r: 187, g: 247, b: 208 },
  "green-300": { r: 134, g: 239, b: 172 },
  "green-400": { r: 74, g: 222, b: 128 },
  "green-500": { r: 34, g: 197, b: 94 },
  "green-600": { r: 22, g: 163, b: 74 },
  "green-700": { r: 21, g: 128, b: 61 },
  "green-800": { r: 22, g: 101, b: 52 },
  "green-900": { r: 20, g: 83, b: 45 },
  "green-950": { r: 5, g: 46, b: 22 },
  // Teal
  "teal-50": { r: 240, g: 253, b: 250 },
  "teal-100": { r: 204, g: 251, b: 241 },
  "teal-200": { r: 153, g: 246, b: 228 },
  "teal-300": { r: 94, g: 234, b: 212 },
  "teal-400": { r: 45, g: 212, b: 191 },
  "teal-500": { r: 20, g: 184, b: 166 },
  "teal-600": { r: 13, g: 148, b: 136 },
  "teal-700": { r: 15, g: 118, b: 110 },
  "teal-800": { r: 17, g: 94, b: 89 },
  "teal-900": { r: 19, g: 78, b: 74 },
  "teal-950": { r: 4, g: 47, b: 46 },
  // Blue
  "blue-50": { r: 239, g: 246, b: 255 },
  "blue-100": { r: 219, g: 234, b: 254 },
  "blue-200": { r: 191, g: 219, b: 254 },
  "blue-300": { r: 147, g: 197, b: 253 },
  "blue-400": { r: 96, g: 165, b: 250 },
  "blue-500": { r: 59, g: 130, b: 246 },
  "blue-600": { r: 37, g: 99, b: 235 },
  "blue-700": { r: 29, g: 78, b: 216 },
  "blue-800": { r: 30, g: 64, b: 175 },
  "blue-900": { r: 30, g: 58, b: 138 },
  "blue-950": { r: 23, g: 37, b: 84 },
  // Indigo
  "indigo-50": { r: 238, g: 242, b: 255 },
  "indigo-100": { r: 224, g: 231, b: 255 },
  "indigo-200": { r: 199, g: 210, b: 254 },
  "indigo-300": { r: 165, g: 180, b: 252 },
  "indigo-400": { r: 129, g: 140, b: 248 },
  "indigo-500": { r: 99, g: 102, b: 241 },
  "indigo-600": { r: 79, g: 70, b: 229 },
  "indigo-700": { r: 67, g: 56, b: 202 },
  "indigo-800": { r: 55, g: 48, b: 163 },
  "indigo-900": { r: 49, g: 46, b: 129 },
  "indigo-950": { r: 30, g: 27, b: 75 },
  // Purple
  "purple-50": { r: 250, g: 245, b: 255 },
  "purple-100": { r: 243, g: 232, b: 255 },
  "purple-200": { r: 233, g: 213, b: 255 },
  "purple-300": { r: 216, g: 180, b: 254 },
  "purple-400": { r: 192, g: 132, b: 252 },
  "purple-500": { r: 168, g: 85, b: 247 },
  "purple-600": { r: 147, g: 51, b: 234 },
  "purple-700": { r: 126, g: 34, b: 206 },
  "purple-800": { r: 107, g: 33, b: 168 },
  "purple-900": { r: 88, g: 28, b: 135 },
  "purple-950": { r: 59, g: 7, b: 100 },
  // Pink
  "pink-50": { r: 253, g: 242, b: 248 },
  "pink-100": { r: 252, g: 231, b: 243 },
  "pink-200": { r: 251, g: 207, b: 232 },
  "pink-300": { r: 249, g: 168, b: 212 },
  "pink-400": { r: 244, g: 114, b: 182 },
  "pink-500": { r: 236, g: 72, b: 153 },
  "pink-600": { r: 219, g: 39, b: 119 },
  "pink-700": { r: 190, g: 24, b: 93 },
  "pink-800": { r: 157, g: 23, b: 77 },
  "pink-900": { r: 131, g: 24, b: 67 },
  "pink-950": { r: 80, g: 7, b: 36 },
  // White / Black / Transparent
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  transparent: { r: 0, g: 0, b: 0 }, // treated as black for contrast purposes
};

// ─── Tailwind class parsing ───────────────────────────────────────────────────

/**
 * Resolves a Tailwind text-colour class to an RGB value.
 * Handles: text-white, text-black, text-gray-500, text-[#hex], text-[rgb(...)].
 *
 * NOTE: Arbitrary values (text-[#hex]) are supported for hex and rgb() only.
 * CSS variables (text-[var(--x)]) are skipped.
 */
function stripDarkPrefix(token: string): string {
  return token.startsWith("dark:") ? token.slice(5) : token;
}

function getBracketContent(token: string): string | null {
  if (!token.startsWith("[") || !token.endsWith("]") || token.length <= 2) {
    return null;
  }
  return token.slice(1, -1);
}

function resolveTailwindTextColor(cls: string): RGB | null {
  const token = stripDarkPrefix(cls);
  if (token.startsWith("text-")) {
    const content = token.slice(5);
    const bracketContent = getBracketContent(content);
    if (bracketContent) {
      return parseColor(bracketContent);
    }
    return TAILWIND_COLORS[content] ?? null;
  }

  return null;
}

/**
 * Resolves a Tailwind background-colour class to an RGB value.
 * Handles: bg-white, bg-black, bg-gray-500, bg-[#hex], bg-[rgb(...)].
 */
function resolveTailwindBgColor(cls: string): RGB | null {
  const token = stripDarkPrefix(cls);
  if (token.startsWith("bg-")) {
    const content = token.slice(3);
    const bracketContent = getBracketContent(content);
    if (bracketContent) {
      return parseColor(bracketContent);
    }
    return TAILWIND_COLORS[content] ?? null;
  }

  return null;
}

// ─── Main checker ─────────────────────────────────────────────────────────────

function splitClasses(value: string): string[] {
  const classes: string[] = [];
  let current = "";

  for (const char of value) {
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      if (current) {
        classes.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    classes.push(current);
  }

  return classes;
}

function isTailwindTextClass(className: string): boolean {
  const normalized = stripDarkPrefix(className);
  if (!normalized.startsWith("text-")) {
    return false;
  }

  const content = normalized.slice(5);
  if (!content) {
    return false;
  }

  const bracketContent = getBracketContent(content);
  if (bracketContent) {
    return Boolean(bracketContent);
  }

  return Boolean(TAILWIND_COLORS[content]);
}

function isTailwindBgClass(className: string): boolean {
  const normalized = stripDarkPrefix(className);
  if (!normalized.startsWith("bg-")) {
    return false;
  }

  const content = normalized.slice(3);
  if (!content) {
    return false;
  }

  const bracketContent = getBracketContent(content);
  if (bracketContent) {
    return Boolean(bracketContent);
  }

  return Boolean(TAILWIND_COLORS[content]);
}

function addContrastDiagnostic(
  diagnostics: vscode.Diagnostic[],
  document: vscode.TextDocument,
  startIndex: number,
  endIndex: number,
  result: ReturnType<typeof evaluateContrast>,
  textClass: string,
  bgClass: string,
): void {
  const diagnostic = makeDiagnostic(
    document,
    startIndex,
    endIndex - startIndex,
    formatContrastMessage(result, `classes Tailwind (${textClass} / ${bgClass})`),
    result.passesAA
      ? vscode.DiagnosticSeverity.Information
      : vscode.DiagnosticSeverity.Warning,
  );

  diagnostics.push(diagnostic);
}

function collectTailwindDiagnosticsForClasses(
  diagnostics: vscode.Diagnostic[],
  classValue: string,
  document: vscode.TextDocument,
  startIndex: number,
  endIndex: number,
): void {
  const classes = splitClasses(classValue);
  const textClasses = classes.filter(isTailwindTextClass);
  const bgClasses = classes.filter(isTailwindBgClass);

  if (textClasses.length === 0 || bgClasses.length === 0) {
    return;
  }

  for (const textClass of textClasses) {
    for (const bgClass of bgClasses) {
      const cleanText = stripDarkPrefix(textClass);
      const cleanBg = stripDarkPrefix(bgClass);
      const fg = resolveTailwindTextColor(cleanText);
      const bg = resolveTailwindBgColor(cleanBg);

      if (!fg || !bg) {
        continue;
      }

      const result = evaluateContrast(fg, bg, "normal");
      if (result.passesAAA) {
        continue;
      }

      addContrastDiagnostic(diagnostics, document, startIndex, endIndex, result, cleanText, cleanBg);
    }
  }
}

export function checkTailwindClasses(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  if (document.languageId === "html") {
    const tree = parseHtml(text);
    walkTree(tree, (node) => {
      if (!isElement(node)) {
        return;
      }

      const classAttr = node.attrs.find((attribute) => attribute.name === "class");
      if (!classAttr?.value) {
        return;
      }

      const startOffset = node.sourceCodeLocation?.startTag?.startOffset ?? 0;
      const endOffset = node.sourceCodeLocation?.startTag?.endOffset ?? node.sourceCodeLocation?.endOffset ?? startOffset + 1;
      collectTailwindDiagnosticsForClasses(
        diagnostics,
        classAttr.value,
        document,
        startOffset,
        endOffset,
      );
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
        if (attrName !== "className" && attrName !== "class") {
          for (const child of Object.values(node)) {
            if (child && typeof child === "object") {
              visit(child);
            }
          }
          return;
        }

        const value = node.value?.type === "StringLiteral"
          ? node.value.value
          : node.value?.expression?.type === "StringLiteral"
            ? node.value.expression.value
            : node.value?.expression?.type === "TemplateLiteral" && node.value.expression.expressions.length === 0
              ? node.value.expression.quasis[0]?.value?.cooked
              : undefined;

        if (typeof value === "string") {
          const range = getLocRange(document, node);
          collectTailwindDiagnosticsForClasses(
            diagnostics,
            value,
            document,
            document.offsetAt(range.start),
            document.offsetAt(range.end),
          );
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
}
