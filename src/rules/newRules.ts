import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseDocument,
  collectTextContent,
  hasParsedAttr,
  getAttr,
  getNodeLocation,
  isElementNode,
  isParsedTextNode,
  type ParsedNode,
} from "../utils/htmlAst";

function toDiagnostic(
  document: vscode.TextDocument,
  node: ParsedNode,
  message: string,
): vscode.Diagnostic {
  const loc = getNodeLocation(node);
  const range = loc
    ? new vscode.Range(
        document.positionAt(loc.startOffset),
        document.positionAt(loc.endOffset),
      )
    : new vscode.Range(document.positionAt(0), document.positionAt(0));

  return new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Warning,
  );
}

function hasAccessibleName(node: ParsedNode): boolean {
  return ["aria-label", "aria-labelledby", "title"].some((name) =>
    hasParsedAttr(node, name),
  );
}

function isInteractiveElement(node: ParsedNode): boolean {
  return ["button", "a", "input", "select", "textarea", "summary"].includes(
    node.tagName ?? "",
  );
}

function isSvgOnly(node: ParsedNode): boolean {
  const children = node.children ?? [];
  if (children.length === 0) {
    return false;
  }

  const hasText = children.some((child: ParsedNode) => {
    if (isParsedTextNode(child)) {
      return child.value.trim().length > 0;
    }

    if (isElementNode(child)) {
      return child.tagName === "svg" || child.tagName === "path";
    }

    return false;
  });

  return children.every((child: ParsedNode) => {
    if (isParsedTextNode(child)) {
      return child.value.trim().length === 0;
    }
    if (isElementNode(child)) {
      return child.tagName === "svg" || child.tagName === "path";
    }
    return false;
  }) && children.some((child: ParsedNode) => isElementNode(child) && child.tagName === "svg");
}

export const duplicateIdRule: A11yRule = {
  id: "duplicate-id",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const seen = new Map<string, ParsedNode>();
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const id = getAttr(node, "id");
        if (id) {
          const prior = seen.get(id);
          if (prior) {
            diagnostics.push(
              toDiagnostic(
                document,
                node,
                `O id "${id}" está duplicado. Cada id deve ser único na página.`,
              ),
            );
          } else {
            seen.set(id, node);
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

export const labelMissingForIdRule: A11yRule = {
  id: "label-missing-for-id",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const ids = new Set<string>();
    const diagnostics: vscode.Diagnostic[] = [];

    const collectIds = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const id = getAttr(node, "id");
        if (id) {
          ids.add(id);
        }
      }

      for (const child of node.children ?? []) {
        collectIds(child);
      }
    };

    collectIds(root);

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "label") {
        const forValue = getAttr(node, "for") ?? getAttr(node, "htmlFor");
        if (forValue && !ids.has(forValue)) {
          diagnostics.push(
            toDiagnostic(
              document,
              node,
              `O label referencia o id inexistente "${forValue}".`,
            ),
          );
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

function splitWhitespace(value: string): string[] {
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
}

export const ariaReferencedIdRule: A11yRule = {
  id: "aria-referenced-id",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const ids = new Set<string>();
    const diagnostics: vscode.Diagnostic[] = [];

    const collectIds = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        const id = getAttr(node, "id");
        if (id) {
          ids.add(id);
        }
      }

      for (const child of node.children ?? []) {
        collectIds(child);
      }
    };

    collectIds(root);

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node)) {
        for (const name of ["aria-labelledby", "aria-describedby"]) {
          const value = getAttr(node, name);
          if (!value) {
            continue;
          }

          for (const id of splitWhitespace(value)) {
            if (!ids.has(id)) {
              diagnostics.push(
                toDiagnostic(
                  document,
                  node,
                  `O atributo ${name} referencia o id inexistente "${id}".`,
                ),
              );
            }
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

export const buttonOnlySvgRule: A11yRule = {
  id: "button-only-svg",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "button") {
        const name = collectTextContent(node).trim();
        const hasName = name.length > 0 || hasAccessibleName(node);
        if (!hasName && isSvgOnly(node)) {
          diagnostics.push(
            toDiagnostic(
              document,
              node,
              "Botão com apenas SVG sem nome acessível. Adicione aria-label, title ou texto visível.",
            ),
          );
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

export const linkEmptyRule: A11yRule = {
  id: "link-empty",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && node.tagName === "a") {
        const text = collectTextContent(node).trim();
        const hasHref = Boolean(getAttr(node, "href"));
        const hasName = text.length > 0 || hasAccessibleName(node);
        if (!hasName && hasHref) {
          diagnostics.push(
            toDiagnostic(
              document,
              node,
              "Link vazio. Adicione texto visível ou um nome acessível para descrever o destino.",
            ),
          );
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

export const clickableNoKeyboardSupportRule: A11yRule = {
  id: "clickable-no-keyboard-support",
  check(text, document) {
    const root = parseDocument(text, document.languageId);
    const diagnostics: vscode.Diagnostic[] = [];

    const visit = (node: ParsedNode): void => {
      if (isElementNode(node) && !isInteractiveElement(node)) {
        const hasOnClick = Boolean(getAttr(node, "onClick") || getAttr(node, "onclick"));
        const hasTabIndex = Boolean(getAttr(node, "tabIndex") || getAttr(node, "tabindex"));
        const hasRole = Boolean(getAttr(node, "role"));

        if (hasOnClick && !hasTabIndex && !hasRole) {
          diagnostics.push(
            toDiagnostic(
              document,
              node,
              "Elemento clicável sem suporte ao teclado. Adicione role, tabIndex ou use um elemento semântico.",
            ),
          );
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
