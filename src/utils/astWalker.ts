// src/utils/astWalker.ts
import type { ParsedNode } from "./htmlAst";

/**
 * Recursively walks a ParsedNode tree (from parseDocument/buildTreeFromBabel),
 * calling `visitor` for every node that has a tagName (i.e. JSX elements or HTML elements).
 *
 * This is the JSX counterpart of `walkTree` from htmlAst.ts (which works on parse5 trees).
 */
export function walkNodes(
  node: ParsedNode,
  visitor: (node: ParsedNode) => void,
): void {
  if (!node) {
    return;
  }

  if (node.tagName) {
    visitor(node);
  }

  const children = node.children ?? node.childNodes ?? [];
  for (const child of children) {
    walkNodes(child as ParsedNode, visitor);
  }
}

/**
 * Return the value of an attribute by name (case-insensitive).
 * Returns `undefined` if the attribute is absent.
 * Returns `""` if present but with no value (boolean attributes).
 */
export function getAttrValue(
  node: ParsedNode,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  return node.attrs?.find((a) => a.name.toLowerCase() === lower)?.value;
}

/**
 * Return true if the element has the given attribute (value may be empty or undefined).
 */
export function hasAttribute(node: ParsedNode, name: string): boolean {
  const lower = name.toLowerCase();
  return (node.attrs ?? []).some((a) => a.name.toLowerCase() === lower);
}

/**
 * Return true if any of the given attributes is present on the element.
 */
export function hasAnyAttribute(node: ParsedNode, ...names: string[]): boolean {
  return names.some((n) => hasAttribute(node, n));
}

/**
 * Extract visible text content from a node's children recursively.
 * Concatenates JSXText / StringLiteral / Text node values.
 */
export function extractText(node: ParsedNode): string {
  const parts: string[] = [];

  const collect = (n: ParsedNode): void => {
    // Text nodes
    if (
      n.type === "JSXText" ||
      n.type === "StringLiteral" ||
      n.type === "Text" ||
      (!n.tagName && n.value !== undefined)
    ) {
      parts.push(n.value ?? "");
      return;
    }
    // Recurse into children
    const kids = n.children ?? n.childNodes ?? [];
    for (const child of kids) {
      collect(child as ParsedNode);
    }
  };

  const kids = node.children ?? node.childNodes ?? [];
  for (const child of kids) {
    collect(child as ParsedNode);
  }

  return parts.join("").trim();
}

/**
 * Return a {startOffset, endOffset} for a node, or null if unavailable.
 * Works for both parse5 nodes (sourceCodeLocation) and Babel nodes (start/end).
 */
export function nodeOffsets(
  node: ParsedNode & { start?: number; end?: number },
): { startOffset: number; endOffset: number } | null {
  // parse5-style location
  if (
    node.sourceCodeLocation?.startOffset !== undefined &&
    node.sourceCodeLocation?.endOffset !== undefined
  ) {
    return {
      startOffset: node.sourceCodeLocation.startOffset,
      endOffset: node.sourceCodeLocation.endOffset,
    };
  }

  // Babel-style (start/end stored directly on node by buildTreeFromBabel — not yet)
  // If not present, return null — caller will use regex offset fallback
  return null;
}
