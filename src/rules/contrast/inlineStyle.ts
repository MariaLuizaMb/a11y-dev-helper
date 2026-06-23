// src/rules/contrast/inlineStyle.ts
import * as vscode from "vscode";
import { makeDiagnostic } from "../../utils/diagnostics";
import {
  parseColor,
  evaluateContrast,
  formatContrastMessage,
} from "../../utils/colorContrast";

/**
 * Checks colour contrast for inline style attributes.
 *
 * Detects pairs where both `color` and `background-color` (or `background`)
 * are specified as parseable values in the same style="..." attribute.
 *
 * Limitations (MVP with regex):
 * - Does not resolve CSS custom properties (var(--x))
 * - Does not inherit or cascade colours from parent elements
 * - `background` shorthand is matched only when it contains a plain colour token
 * - Gradient and image backgrounds are skipped (cannot determine effective colour)
 *
 * NOTE: Replace with AST + CSS parsing for production-grade accuracy.
 */
export function checkInlineStyles(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  /**
   * Matches style="..." or style={`...`} / style={{ ... }} attributes.
   * Captures the style value string.
   */
  const inlineStyleRegex =
    /\bstyle\s*=\s*(?:"([^"]*?)"|'([^']*?)'|\{`([^`]*?)`\}|\{\{([^}]*?)\}\})/gi;

  /**
   * Extracts a color: <value> declaration from a style string.
   * Handles CSS property syntax and JS object key syntax (color: "...", color: '...').
   */
  const colorPropRegex =
    /(?:^|[;,{])\s*color\s*[:\s]\s*(["']?)([^;,"'}\s]+)\1/i;

  /**
   * Extracts background-color or background shorthand.
   * Skips gradients and url() values.
   */
  const bgPropRegex =
    /(?:^|[;,{])\s*background(?:-color)?\s*[:\s]\s*(["']?)([^;,"'}\s]+)\1/i;

  const diagnostics: vscode.Diagnostic[] = [];

  for (const match of text.matchAll(inlineStyleRegex)) {
    const styleValue = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";

    // Skip if it contains CSS variables or gradients — cannot resolve statically
    if (/var\s*\(|gradient|url\s*\(/i.test(styleValue)) {
      continue;
    }

    const colorMatch = colorPropRegex.exec(styleValue);
    const bgMatch = bgPropRegex.exec(styleValue);

    if (!colorMatch || !bgMatch) {
      continue; // Need both fg and bg to evaluate contrast
    }

    const fgRaw = colorMatch[2];
    const bgRaw = bgMatch[2];

    const fg = parseColor(fgRaw);
    const bg = parseColor(bgRaw);

    if (!fg || !bg) {
      continue; // Unrecognised colour format — skip silently
    }

    const result = evaluateContrast(fg, bg, "normal");

    if (result.passesAAA) {
      continue; // Passes both levels — no diagnostic
    }

    diagnostics.push(
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        formatContrastMessage(
          result,
          `estilo inline (color: ${fgRaw}, background: ${bgRaw})`,
        ),
        result.passesAA
          ? vscode.DiagnosticSeverity.Information // AA ok, AAA fail
          : vscode.DiagnosticSeverity.Warning, // AA fail
      ),
    );
  }

  return diagnostics;
}
