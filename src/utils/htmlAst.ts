// src/utils/htmlAst.ts
import * as vscode from "vscode";
import { parse, parseFragment } from "parse5";
import type { DefaultTreeAdapterMap, Token } from "parse5";

// ─── Aliases ────────────────────────────────────────────────────────────────

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Document = DefaultTreeAdapterMap["document"];
type TextNode = DefaultTreeAdapterMap["textNode"];
type Attribute = Token.Attribute;

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
  const isFullDocument = /<!doctype|<html\b/i.test(text);
  return isFullDocument
    ? (parse(text, opts) as unknown as Document)
    : (parseFragment(text, opts) as unknown as Document);
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
