// src/rules/ariaRole.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/**
 * Detects elements with role attributes whose value is not a valid WAI-ARIA role.
 * Typos (role="botao", role="btn") and deprecated roles are flagged as warnings.
 *
 * Source: WAI-ARIA 1.2 — https://www.w3.org/TR/wai-aria-1.2/#role_definitions
 *
 * NOTE: This rule uses regex for MVP. Replace with AST parsing for accurate
 * attribute detection and role context validation (e.g. required owned elements).
 */
export const ariaRoleRule: A11yRule = {
  id: "aria-invalid-role",
  check(text, document) {
    /**
     * Full list of valid WAI-ARIA 1.2 roles (abstract roles excluded —
     * they are not valid in HTML author usage).
     */
    const validRoles = new Set([
      // Document structure
      "article",
      "blockquote",
      "caption",
      "cell",
      "columnheader",
      "definition",
      "deletion",
      "directory",
      "document",
      "emphasis",
      "feed",
      "figure",
      "generic",
      "group",
      "heading",
      "img",
      "insertion",
      "list",
      "listitem",
      "mark",
      "math",
      "meter",
      "none",
      "note",
      "paragraph",
      "presentation",
      "row",
      "rowgroup",
      "rowheader",
      "separator",
      "strong",
      "subscript",
      "superscript",
      "table",
      "term",
      "time",
      "tooltip",
      // Landmark
      "banner",
      "complementary",
      "contentinfo",
      "form",
      "main",
      "navigation",
      "region",
      "search",
      // Live region
      "alert",
      "log",
      "marquee",
      "status",
      "timer",
      // Window
      "alertdialog",
      "dialog",
      // Widget
      "button",
      "checkbox",
      "combobox",
      "grid",
      "gridcell",
      "link",
      "listbox",
      "menu",
      "menubar",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "progressbar",
      "radio",
      "radiogroup",
      "scrollbar",
      "searchbox",
      "slider",
      "spinbutton",
      "switch",
      "tab",
      "tablist",
      "tabpanel",
      "textbox",
      "tree",
      "treegrid",
      "treeitem",
      // Graphics (WAI-ARIA Graphics 1.0)
      "graphics-document",
      "graphics-object",
      "graphics-symbol",
      // DPUB-ARIA 1.1 (common subset)
      "doc-abstract",
      "doc-acknowledgments",
      "doc-afterword",
      "doc-appendix",
      "doc-backlink",
      "doc-biblioentry",
      "doc-bibliography",
      "doc-biblioref",
      "doc-chapter",
      "doc-colophon",
      "doc-conclusion",
      "doc-cover",
      "doc-credit",
      "doc-credits",
      "doc-dedication",
      "doc-endnote",
      "doc-endnotes",
      "doc-epigraph",
      "doc-epilogue",
      "doc-errata",
      "doc-example",
      "doc-footnote",
      "doc-foreword",
      "doc-glossary",
      "doc-glossref",
      "doc-index",
      "doc-introduction",
      "doc-noteref",
      "doc-notice",
      "doc-pagebreak",
      "doc-pagefooter",
      "doc-pageheader",
      "doc-pagelist",
      "doc-part",
      "doc-preface",
      "doc-prologue",
      "doc-pullquote",
      "doc-qna",
      "doc-subtitle",
      "doc-tip",
      "doc-toc",
    ]);

    /**
     * Matches role="..." or role={'...'} attributes on any element.
     * Captures the role value string (may contain multiple space-separated roles).
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate attribute parsing.
     */
    const roleAttrRegex =
      /\brole\s*=\s*(?:(["'])([^"']*)\1|\{['"]([^'"]*)['"]\})/gi;

    const diagnostics: vscode.Diagnostic[] = [];

    for (const match of text.matchAll(roleAttrRegex)) {
      const roleValue = (match[2] ?? match[3] ?? "").trim();

      if (!roleValue) {
        continue;
      }

      // role can contain multiple space-separated values (composite roles)
      const roleTokens = roleValue.split(/\s+/);

      for (const token of roleTokens) {
        if (!validRoles.has(token.toLowerCase())) {
          diagnostics.push(
            makeDiagnostic(
              document,
              match.index,
              match[0].length,
              `role="${token}" não é um valor ARIA válido. Verifique a ortografia ou consulte a lista de roles WAI-ARIA 1.2.`,
              vscode.DiagnosticSeverity.Warning,
            ),
          );
          break; // One diagnostic per role attribute is enough
        }
      }
    }

    return diagnostics;
  },
};
