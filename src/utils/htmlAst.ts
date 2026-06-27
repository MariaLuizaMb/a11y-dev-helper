// src/utils/htmlAst.ts
import * as vscode from "vscode";
import { parse, parseFragment } from "parse5";
import type { DefaultTreeAdapterMap, Token } from "parse5";
type ParserOptions = {
  sourceType?: "module" | "script" | "unambiguous";
  plugins?: string[];
  errorRecovery?: boolean;
};
const { parse: parseBabel } = require("@babel/parser") as {
  parse: (text: string, options: ParserOptions) => any;
};

const babelParserOptions: ParserOptions = {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
  errorRecovery: true,
};

// ─── Aliases ────────────────────────────────────────────────────────────────

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Document = DefaultTreeAdapterMap["document"];
type TextNode = DefaultTreeAdapterMap["textNode"];
type Attribute = Token.Attribute;

export interface ParsedNode {
  tagName?: string;
  attrs?: Array<{ name: string; value?: string }>;
  children?: ParsedNode[];
  value?: string;
  type?: string;
  sourceCodeLocation?: {
    startOffset?: number;
    endOffset?: number;
  };
  childNodes?: ParsedNode[];
  nodeName?: string;
}

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * A callback invoked once for each Element node encountered during traversal.
 * Return `false` to skip traversal of this node's children.
 */
export type ElementVisitor = (node: Element) => void | false;

/** Source location returned by parse5 when sourceCodeLocationInfo is enabled. */
export interface NodeLocation {
  startOffset: number;
  endOffset: number;
}

// ─── Tree walking ────────────────────────────────────────────────────────────

/** Recursively walk every node in a parse5 tree, calling `visitor` for elements. */
export function walkTree(root: Node, visitor: ElementVisitor): void {
  if (isElement(root)) {
    const descend = visitor(root);
    if (descend === false) {
      return;
    }
  }
  if ("childNodes" in root && root.childNodes) {
    for (const child of root.childNodes) {
      walkTree(child, visitor);
    }
  }
}

// ─── HTML parsing ────────────────────────────────────────────────────────────

/**
 * Parse an HTML string into a traversable tree with source-location info.
 *
 * Uses `parse` for full HTML documents (files that contain `<html>` or `<!DOCTYPE>`),
 * and `parseFragment` for partial HTML (JSX return values, component templates).
 * Both are lossless for our purposes — we only need element positions.
 */
export function parseHtml(text: string): Document {
  const opts = { sourceCodeLocationInfo: true } as const;
  const normalized = text.toLowerCase();
  const isFullDocument = normalized.includes("<!doctype") || normalized.includes("<html");
  return isFullDocument
    ? (parse(text, opts) as unknown as Document)
    : (parseFragment(text, opts) as unknown as Document);
}

function normalizeAttributeName(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized === "htmlfor") {
    return "for";
  }
  if (normalized === "classname") {
    return "class";
  }
  return normalized;
}

function toParsedNode(value: unknown): ParsedNode {
  if (!value || typeof value !== "object") {
    return {};
  }

  const node = value as Record<string, unknown>;
  const nodeName = typeof node.nodeName === "string" ? node.nodeName : undefined;

  if (nodeName === "#text") {
    return {
      value: typeof node.value === "string" ? node.value : "",
      type: "Text",
      children: [],
      nodeName,
    };
  }

  const attrs = Array.isArray(node.attrs)
    ? (node.attrs as Array<Record<string, unknown>>).map((attr) => ({
        name: normalizeAttributeName(String(attr.name ?? "")),
        value: typeof attr.value === "string" ? attr.value : undefined,
      }))
    : [];

  const childNodes = Array.isArray(node.childNodes)
    ? (node.childNodes as unknown[]).map((child) => toParsedNode(child))
    : [];

  return {
    tagName: typeof node.tagName === "string" ? String(node.tagName).toLowerCase() : undefined,
    attrs,
    children: childNodes,
    value: typeof node.value === "string" ? node.value : undefined,
    type: nodeName,
    sourceCodeLocation:
      node.sourceCodeLocation && typeof node.sourceCodeLocation === "object"
        ? {
            startOffset: (node.sourceCodeLocation as { startOffset?: number }).startOffset,
            endOffset: (node.sourceCodeLocation as { endOffset?: number }).endOffset,
          }
        : undefined,
    nodeName,
  };
}

function buildTreeFromBabel(node: unknown): ParsedNode {
  if (!node || typeof node !== "object") {
    return {};
  }

  const current = node as Record<string, unknown>;
  const resolveAttributeValue = (valueNode: unknown): string | undefined => {
    if (!valueNode || typeof valueNode !== "object") {
      return undefined;
    }

    const currentValue = valueNode as Record<string, unknown>;
    if (currentValue.type === "StringLiteral") {
      return typeof currentValue.value === "string" ? currentValue.value : undefined;
    }

    if (currentValue.type === "NumericLiteral" || currentValue.type === "BooleanLiteral") {
      return String(currentValue.value ?? "");
    }

    if (currentValue.type === "Identifier") {
      return typeof currentValue.name === "string" ? currentValue.name : undefined;
    }

    if (currentValue.type === "JSXExpressionContainer") {
      return resolveAttributeValue(currentValue.expression);
    }

    return undefined;
  };

  if (current.type === "Program") {
    const body = Array.isArray(current.body) ? current.body : [];
    return {
      children: body.map((child) => buildTreeFromBabel(child)).filter(Boolean),
      type: "Program",
    };
  }

  if (current.type === "ExpressionStatement") {
    return buildTreeFromBabel(current.expression);
  }

  if (current.type === "ReturnStatement") {
    return buildTreeFromBabel(current.argument);
  }

  if (current.type === "JSXElement") {
    const openingElement = current.openingElement as Record<string, unknown> | undefined;
    const nameNode = openingElement?.name as Record<string, unknown> | undefined;
    const tagName =
      nameNode?.type === "JSXIdentifier"
        ? String(nameNode.name)
        : nameNode?.type === "JSXMemberExpression"
          ? String((nameNode.property as { name?: string })?.name ?? "")
          : "div";

    const attributes = Array.isArray(openingElement?.attributes)
      ? (openingElement?.attributes as Array<Record<string, unknown>>).map((attribute) => {
          const nameNode = attribute.name as Record<string, unknown> | undefined;
          const attributeName =
            nameNode?.type === "JSXIdentifier"
              ? String(nameNode.name)
              : nameNode?.type === "JSXNamespacedName"
                ? String((nameNode.namespace as { name?: string })?.name ?? "")
                : "";
          const valueNode = attribute.value as Record<string, unknown> | undefined;
          const value = resolveAttributeValue(valueNode);
          return {
            name: normalizeAttributeName(attributeName),
            value,
          };
        })
      : [];

    const children = Array.isArray(current.children)
      ? (current.children as unknown[])
          .map((child) => buildTreeFromBabel(child))
          .filter(Boolean)
      : [];

    return {
      tagName,
      attrs: attributes,
      children,
      type: current.type,
    };
  }

  if (current.type === "JSXText") {
    return {
      value: String(current.value ?? ""),
      type: current.type,
      children: [],
    };
  }

  if (current.type === "JSXExpressionContainer") {
    return buildTreeFromBabel(current.expression);
  }

  if (current.type === "StringLiteral") {
    return {
      value: String(current.value ?? ""),
      type: current.type,
      children: [],
    };
  }

  if (current.type === "JSXFragment") {
    const children = Array.isArray(current.children)
      ? (current.children as unknown[])
          .map((child) => buildTreeFromBabel(child))
          .filter(Boolean)
      : [];
    return {
      tagName: "fragment",
      children,
      type: current.type,
    };
  }

  return {
    type: current.type as string | undefined,
    children: [],
  };
}

export function parseBabelAst(text: string): any {
  try {
    return parseBabel(text, babelParserOptions);
  } catch {
    return {
      program: {
        type: "Program",
        body: [],
        directives: [],
      },
    };
  }
}

export function parseDocument(text: string, languageId: string): ParsedNode {
  if (languageId === "html") {
    try {
      const tree = parseHtml(text);
      return toParsedNode(tree);
    } catch {
      return { children: [], type: "Document" };
    }
  }

  const ast = parseBabelAst(text);
  return buildTreeFromBabel(ast?.program ?? { type: "Program", body: [] });
}

export function getLocRange(
  document: vscode.TextDocument,
  node: { loc?: { start: { line: number; column: number }; end: { line: number; column: number } } } | undefined,
): vscode.Range {
  if (!node?.loc) {
    return new vscode.Range(document.positionAt(0), document.positionAt(0));
  }

  const startOffset = document.offsetAt(
    new vscode.Position(Math.max(0, node.loc.start.line - 1), node.loc.start.column),
  );
  const endOffset = document.offsetAt(
    new vscode.Position(Math.max(0, node.loc.end.line - 1), node.loc.end.column),
  );
  return new vscode.Range(document.positionAt(startOffset), document.positionAt(endOffset));
}

export function collectTextContent(node: ParsedNode): string {
  if (!node.children?.length) {
    return node.value ?? "";
  }

  return (node.children ?? [])
    .map((child: ParsedNode) => collectTextContent(child))
    .join(" ");
}

export function getAttr(node: ParsedNode, name: string): string | undefined {
  const normalizedName = normalizeAttributeName(name);
  return node.attrs?.find((attr) => normalizeAttributeName(attr.name) === normalizedName)?.value;
}

export function hasParsedAttr(node: ParsedNode, name: string): boolean {
  const normalizedName = normalizeAttributeName(name);
  return (node.attrs ?? []).some((attr) => normalizeAttributeName(attr.name) === normalizedName);
}

export function getNodeLocation(node: ParsedNode): { startOffset: number; endOffset: number } | null {
  const loc = node.sourceCodeLocation;
  if (loc?.startOffset !== undefined && loc?.endOffset !== undefined) {
    return { startOffset: loc.startOffset, endOffset: loc.endOffset };
  }

  return null;
}

export function isElementNode(node: ParsedNode): node is ParsedNode & { tagName: string } {
  return Boolean(node.tagName);
}

export function isParsedTextNode(node: ParsedNode): node is ParsedNode & { value: string } {
  return node.type === "StringLiteral" || node.type === "JSXText" || node.type === "Text" || Boolean(node.value && !node.tagName);
}

// ─── Attribute helpers ───────────────────────────────────────────────────────

/** Return the value of a named attribute, or `undefined` if absent. */
export function attr(node: Element, name: string): string | undefined {
  return node.attrs.find((a: Attribute) => a.name === name)?.value;
}

/** Return true if the element has the named attribute (value may be empty). */
export function hasAttr(node: Element, name: string): boolean {
  return node.attrs.some((a: Attribute) => a.name === name);
}

/**
 * Return the first non-empty value among the given attribute names,
 * or `undefined` if none are present or all are empty strings.
 */
export function firstAttr(
  node: Element,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const val = attr(node, name);
    if (val !== undefined) {
      return val;
    }
  }
  return undefined;
}

/** Return true if any of the given attributes is present on the element. */
export function hasAnyAttr(node: Element, ...names: string[]): boolean {
  return names.some((n) => hasAttr(node, n));
}

// ─── Text content ────────────────────────────────────────────────────────────

/** Extract the concatenated visible text content of an element (depth-first). */
export function textContent(node: Element): string {
  let text = "";
  walkTree(node, () => {}); // ensure children are visited
  const collect = (n: Node): void => {
    if (isTextNode(n)) {
      text += n.value;
    }
    if ("childNodes" in n && n.childNodes) {
      for (const child of n.childNodes) {
        collect(child);
      }
    }
  };
  collect(node);
  return text;
}

// ─── Source location helpers ─────────────────────────────────────────────────

/**
 * Convert a parse5 source location to a VS Code Range.
 * Falls back to a zero-length range at offset 0 if location is missing.
 */
export function locationToRange(
  document: vscode.TextDocument,
  loc: NodeLocation | null | undefined,
): vscode.Range {
  if (!loc) {
    return new vscode.Range(document.positionAt(0), document.positionAt(0));
  }
  return new vscode.Range(
    document.positionAt(loc.startOffset),
    document.positionAt(loc.endOffset),
  );
}

/**
 * Return the source location of a node's opening tag.
 * For void elements (img, input…) this is the same as the full element location.
 */
export function openingTagLocation(node: Element): NodeLocation | null {
  const loc = (node as unknown as Record<string, unknown>)
    .sourceCodeLocation as
    | (NodeLocation & { startTag?: NodeLocation })
    | undefined;

  if (!loc) {
    return null;
  }

  // For elements with children, `startTag` is the opening tag only
  return loc.startTag ?? loc;
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isElement(node: Node): node is Element {
  return (node as Element).tagName !== undefined;
}

export function isTextNode(node: Node): node is TextNode {
  return node.nodeName === "#text";
}
