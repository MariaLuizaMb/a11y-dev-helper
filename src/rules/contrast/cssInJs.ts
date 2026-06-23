// src/rules/contrast/cssInJs.ts
import * as vscode from "vscode";
import { makeDiagnostic } from "../../utils/diagnostics";
import {
  parseColor,
  evaluateContrast,
  formatContrastMessage,
} from "../../utils/colorContrast";

/**
 * Checks colour contrast inside CSS-in-JS patterns.
 *
 * Supported patterns:
 * ─ MUI / Emotion sx prop:      sx={{ color: '...', backgroundColor: '...' }}
 * ─ styled-components template: styled.div`color: ...; background-color: ...`
 * ─ Object styles (general):    { color: '...', background: '...' }
 *
 * Limitations (MVP with regex):
 * - Does not resolve theme tokens (theme.palette.text.primary)
 * - Does not resolve JS variables or expressions
 * - Nested selectors inside styled-components are not traversed
 * - Only analyses static string/hex values
 *
 * NOTE: Replace with Babel AST + theme resolver for production accuracy.
 */

// ─── sx prop ─────────────────────────────────────────────────────────────────

/**
 * Matches sx={{ ... }} props (MUI / Emotion).
 * Captures the object literal content between the outer braces.
 *
 * NOTE: Regex is used for MVP. Replace with AST parsing for accurate prop extraction.
 */
const sxPropRegex = /\bsx\s*=\s*\{\{([\s\S]*?)\}\}/gi;

/**
 * Matches color / colour property in a JS object literal.
 * Handles single and double quotes.
 */
const jsColorPropRegex = /(?:^|[,{;\n])\s*color\s*:\s*(["'])([^"']+)\1/i;

/**
 * Matches backgroundColor / background property in a JS object literal.
 * Handles single and double quotes.
 */
const jsBgPropRegex =
  /(?:^|[,{;\n])\s*background(?:Color)?\s*:\s*(["'])([^"']+)\1/i;

// ─── styled-components template literals ─────────────────────────────────────

/**
 * Matches styled-components tagged template literals.
 * Pattern: styled.tag`...` or styled(Component)`...`
 * Captures the CSS content inside the backticks.
 *
 * NOTE: Regex is used for MVP. Does not handle interpolations (${...}).
 * Replace with AST + styled-components babel plugin for accuracy.
 */
const styledTemplateRegex =
  /styled(?:\.[a-zA-Z]+|\([^)]+\))\s*(?:`([^`]*?)`|\.attrs\([^)]*\)\s*`([^`]*?)`)/g;

/**
 * Matches a CSS color property value inside a template string.
 */
const cssColorPropRegex = /(?:^|[;{])\s*color\s*:\s*([^;}\n]+)/im;

/**
 * Matches a CSS background-color or background shorthand inside a template string.
 */
const cssBgPropRegex = /(?:^|[;{])\s*background(?:-color)?\s*:\s*([^;}\n]+)/im;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAndEvaluate(
  fgRaw: string,
  bgRaw: string,
  document: vscode.TextDocument,
  matchIndex: number,
  matchLength: number,
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
    matchIndex,
    matchLength,
    formatContrastMessage(result, source),
    result.passesAA
      ? vscode.DiagnosticSeverity.Information
      : vscode.DiagnosticSeverity.Warning,
  );
}

// ─── Main checker ─────────────────────────────────────────────────────────────

export function checkCssInJs(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  // ── sx={{ }} prop ──────────────────────────────────────────────────────────
  for (const match of text.matchAll(sxPropRegex)) {
    const objectContent = match[1] ?? "";

    // Skip if it contains theme tokens or dynamic expressions
    if (/theme\s*\.|var\s*\(|\$\{/.test(objectContent)) {
      continue;
    }

    const colorMatch = jsColorPropRegex.exec(objectContent);
    const bgMatch = jsBgPropRegex.exec(objectContent);

    if (!colorMatch || !bgMatch) {
      continue;
    }

    const diag = extractAndEvaluate(
      colorMatch[2],
      bgMatch[2],
      document,
      match.index,
      match[0].length,
      `sx prop (color: ${colorMatch[2]}, background: ${bgMatch[2]})`,
    );

    if (diag) {
      diagnostics.push(diag);
    }
  }

  // ── styled-components template literals ────────────────────────────────────
  for (const match of text.matchAll(styledTemplateRegex)) {
    const cssContent = match[1] ?? match[2] ?? "";

    // Skip if it contains interpolations we cannot resolve
    if (/\$\{/.test(cssContent)) {
      continue;
    }

    const colorMatch = cssColorPropRegex.exec(cssContent);
    const bgMatch = cssBgPropRegex.exec(cssContent);

    if (!colorMatch || !bgMatch) {
      continue;
    }

    const fgRaw = colorMatch[1].trim();
    const bgRaw = bgMatch[1].trim();

    // Skip CSS variables and gradients
    if (/var\s*\(|gradient|inherit|currentColor/i.test(fgRaw + bgRaw)) {
      continue;
    }

    const diag = extractAndEvaluate(
      fgRaw,
      bgRaw,
      document,
      match.index,
      match[0].length,
      `styled-component (color: ${fgRaw}, background: ${bgRaw})`,
    );

    if (diag) {
      diagnostics.push(diag);
    }
  }

  return diagnostics;
}
