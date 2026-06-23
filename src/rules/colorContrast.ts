// src/rules/colorContrast.ts
import { A11yRule } from "../utils/diagnostics";
import { checkInlineStyles } from "./contrast/inlineStyle";
import { checkTailwindClasses } from "./contrast/tailwindClasses";
import { checkCssInJs } from "./contrast/cssInJs";

/**
 * Orchestrates all colour-contrast sub-checkers into a single A11yRule.
 *
 * Sub-checkers:
 * ─ inlineStyle  → style="color: ...; background-color: ..."
 * ─ tailwind     → text-gray-900 bg-white (Tailwind v3 default palette)
 * ─ cssInJs      → sx={{ color: '...' }} and styled.div`color: ...`
 *
 * Severity mapping (both levels reported):
 * ─ Warning     → fails WCAG AA  (ratio < 4.5:1 for normal text)
 * ─ Information → passes AA but fails AAA (ratio < 7.0:1 for normal text)
 *
 * Known limitations at this MVP stage:
 * - CSS custom properties (var(--x)) are skipped — cannot resolve statically
 * - Inherited or cascaded colours from parent elements are not tracked
 * - Font size / weight are not inferred; normal-text thresholds are always used
 * - Tailwind custom palette (tailwind.config.js) is not read
 * - Theme tokens in CSS-in-JS (theme.palette.primary) are not resolved
 * - Dark-mode variants (dark:text-white) are detected only on the same element
 *
 * Future improvements:
 * - Integrate a CSS/Tailwind config reader to resolve custom colours
 * - Use an AST (parse5, @babel/parser) to track inherited colour context
 * - Infer large-text threshold from font-size / font-weight declarations
 */
export const colorContrastRule: A11yRule = {
  id: "color-contrast",
  check(text, document) {
    return [
      ...checkInlineStyles(text, document),
      ...checkTailwindClasses(text, document),
      ...checkCssInJs(text, document),
    ];
  },
};
