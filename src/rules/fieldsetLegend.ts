// src/rules/fieldsetLegend.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/**
 * Detects <fieldset> elements that do not contain a <legend> child.
 *
 * A <legend> provides a caption for the group of controls inside the fieldset,
 * which screen readers announce before each field in the group. Without it,
 * the relationship between the fields is not conveyed to assistive technologies.
 *
 * WCAG reference: 1.3.1 Info and Relationships (Level A)
 *
 * Accepts <legend> anywhere inside the fieldset (not only as the first child),
 * since screen readers handle both placements.
 *
 * NOTE: This rule uses regex for MVP. Nested fieldsets may produce false positives
 * because the outer fieldset's closing tag is matched before its actual end.
 * Replace with AST parsing for accurate nested structure detection.
 */
export const fieldsetLegendRule: A11yRule = {
  id: "fieldset-missing-legend",
  check(text, document) {
    /**
     * Matches <fieldset>...</fieldset> blocks and captures inner content.
     * NOTE: Regex does not handle nested fieldsets correctly — replace with AST.
     */
    const fieldsetRegex = /<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/gi;

    /**
     * Detects a <legend> element inside the captured fieldset content.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate child detection.
     */
    const legendRegex = /<legend\b/i;

    /**
     * Detects aria-labelledby or aria-label as alternatives to <legend>.
     * These are valid fallbacks when a visual legend is not appropriate.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const accessibleNameRegex = /\b(?:aria-label|aria-labelledby)\s*=/i;

    return [...text.matchAll(fieldsetRegex)].flatMap((match) => {
      const innerContent = match[1] ?? "";
      const openingTag = match[0].slice(0, match[0].indexOf(">") + 1);

      if (
        legendRegex.test(innerContent) ||
        accessibleNameRegex.test(openingTag)
      ) {
        return [];
      }

      return [
        makeDiagnostic(
          document,
          match.index,
          match[0].length,
          "<fieldset> sem <legend>. Adicione um <legend> para descrever o grupo de campos — leitores de tela anunciam o legend antes de cada campo dentro do fieldset.",
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
