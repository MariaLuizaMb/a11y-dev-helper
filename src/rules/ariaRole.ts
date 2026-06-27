// src/rules/ariaRole.ts
import * as vscode from "vscode";
import { A11yRule } from "../utils/diagnostics";
import {
  getAttr,
  getNodeLocation,
  isElementNode,
  parseDocument,
  type ParsedNode,
} from "../utils/htmlAst";

/**
 * Detects elements with role attributes whose value is not a valid WAI-ARIA role.
 * Typos (role="botao", role="btn") and deprecated roles are flagged as warnings.
 *
 * Source: WAI-ARIA 1.2 — https://www.w3.org/TR/wai-aria-1.2/#role_definitions
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

    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const splitWhitespace = (value: string): string[] => {
      const tokens: string[] = [];
      let current = "";

      for (const char of value) {
        if (char === " " || char === "\n" || char === "\r" || char === "\t") {
          if (current) {
            tokens.push(current);
            current = "";
          }
          continue;
        }

        current += char;
      }

      if (current) {
        tokens.push(current);
      }

      return tokens;
    };

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const roleValue = getAttr(node, "role")?.trim();
        if (!roleValue) {
          for (const child of node.children ?? []) {
            visit(child);
          }
          return;
        }

        const roleTokens = splitWhitespace(roleValue);
        for (const token of roleTokens) {
          if (!validRoles.has(token.toLowerCase())) {
            const loc = getNodeLocation(node);
            const range = loc
              ? new vscode.Range(
                  document.positionAt(loc.startOffset),
                  document.positionAt(loc.endOffset),
                )
              : new vscode.Range(document.positionAt(0), document.positionAt(0));

            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `role="${token}" não é um valor ARIA válido. Verifique a ortografia ou consulte a lista de roles WAI-ARIA 1.2.`,
                vscode.DiagnosticSeverity.Warning,
              ),
            );
            break;
          }
        }
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    };

    visit(root);
    return diagnostics;
  },
};
