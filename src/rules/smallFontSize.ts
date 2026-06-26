// src/rules/smallFontSize.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/**
 * Detects inline font-size declarations smaller than 12px.
 *
 * Text smaller than 12px is generally considered unreadable for users with
 * low vision, even without a diagnosed visual impairment.
 * WCAG 1.4.4 (Resize Text, AA) requires text to be resizable up to 200%
 * without loss of content, and very small base sizes make this impractical.
 *
 * Supported units: px, pt (converted to px: 1pt ≈ 1.333px), rem/em (estimated
 * against a 16px base).
 *
 * NOTE: This rule uses regex for MVP. It only catches inline styles — CSS class
 * rules and CSS-in-JS theme scales are not analysed. Replace with a CSS parser
 * and style resolver for full coverage.
 */
export const smallFontSizeRule: A11yRule = {
  id: "small-font-size",
  check(text, document) {
    const MIN_PX = 12;
    const BASE_REM_PX = 16; // browser default
    const PT_TO_PX = 1.3333;

    /**
     * Matches font-size declarations inside style="..." or style={{ ... }} attributes.
     * Captures the numeric value and the unit (px, pt, rem, em).
     * NOTE: Regex is used for MVP. Replace with AST + CSS parsing for full coverage.
     */
    const fontSizeInlineRegex =
      /\bstyle\s*=\s*(?:"[^"]*\bfont-size\s*:\s*([\d.]+)(px|pt|rem|em)[^"]*"|'[^']*\bfont-size\s*:\s*([\d.]+)(px|pt|rem|em)[^']*'|\{\{[^}]*\bfontSize\s*:\s*['"]?([\d.]+)(px|pt|rem|em)['"]?[^}]*\}\})/gi;

    /**
     * Fallback: also catches bare font-size in JSX sx={{ fontSize: N }} (unitless = px in MUI).
     * NOTE: Regex is used for MVP.
     */
    const fontSizeUnitlessRegex =
      /\bfontSize\s*:\s*(\d+)(?!\s*['"]?(px|pt|rem|em))/gi;

    const diagnostics: vscode.Diagnostic[] = [];

    // ── Inline style attribute ────────────────────────────────────────────────
    for (const match of text.matchAll(fontSizeInlineRegex)) {
      // Groups differ between the three capture alternatives
      const value = parseFloat(match[1] ?? match[3] ?? match[5] ?? "0");
      const unit = (match[2] ?? match[4] ?? match[6] ?? "px").toLowerCase();

      const px = toPx(value, unit, BASE_REM_PX, PT_TO_PX);

      if (px !== null && px < MIN_PX) {
        diagnostics.push(
          makeDiagnostic(
            document,
            match.index,
            match[0].length,
            `font-size de ${value}${unit} (≈${px.toFixed(1)}px) pode ser ilegível. Prefira no mínimo 12px para texto de conteúdo.`,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }
    }

    // ── Unitless fontSize in CSS-in-JS (MUI interprets as px) ────────────────
    for (const match of text.matchAll(fontSizeUnitlessRegex)) {
      const value = parseInt(match[1], 10);
      if (value < MIN_PX) {
        diagnostics.push(
          makeDiagnostic(
            document,
            match.index,
            match[0].length,
            `fontSize: ${value} (equivalente a ${value}px em MUI/Emotion) pode ser ilegível. Prefira no mínimo 12px para texto de conteúdo.`,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }
    }

    return diagnostics;
  },
};

// ─── Unit conversion ─────────────────────────────────────────────────────────

function toPx(
  value: number,
  unit: string,
  baseRemPx: number,
  ptToPx: number,
): number | null {
  switch (unit) {
    case "px":
      return value;
    case "pt":
      return value * ptToPx;
    case "rem":
      return value * baseRemPx;
    case "em":
      return value * baseRemPx; // approximation — true em depends on parent
    default:
      return null;
  }
}
