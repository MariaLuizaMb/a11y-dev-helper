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
  sourceCodeLocation?: { startOffset?: number; endOffset?: number };
  /** Babel opening-tag character offsets — used for VS Code diagnostic ranges */
  start?: number;
  end?: number;
  childNodes?: ParsedNode[];
  nodeName?: string;
}

export type ElementVisitor = (node: Element) => void | false;
export interface NodeLocation {
  startOffset: number;
  endOffset: number;
}

// ─── parse5 walking ───────────────────────────────────────────────────────────

export function walkTree(root: Node, visitor: ElementVisitor): void {
  if (isElement(root)) {
    const descend = visitor(root);
    if (descend === false) return;
  }
  if ("childNodes" in root && root.childNodes) {
    for (const child of root.childNodes) walkTree(child, visitor);
  }
}

export function parseHtml(text: string): Document {
  const opts = { sourceCodeLocationInfo: true } as const;
  const lower = text.toLowerCase();
  const isFullDoc = lower.includes("<!doctype") || lower.includes("<html");
  return isFullDoc
    ? (parse(text, opts) as unknown as Document)
    : (parseFragment(text, opts) as unknown as Document);
}

// ─── Attribute normalisation ─────────────────────────────────────────────────

function normalizeAttrName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "htmlfor") return "for";
  if (lower === "classname") return "class";
  return lower;
}

// ─── parse5 → ParsedNode ─────────────────────────────────────────────────────

function toParsedNode(value: unknown): ParsedNode {
  if (!value || typeof value !== "object") return {};
  const node = value as Record<string, unknown>;
  const nodeName =
    typeof node.nodeName === "string" ? node.nodeName : undefined;

  if (nodeName === "#text") {
    return {
      value: typeof node.value === "string" ? node.value : "",
      type: "Text",
      children: [],
      nodeName,
    };
  }

  const attrs = Array.isArray(node.attrs)
    ? (node.attrs as Array<Record<string, unknown>>).map((a) => ({
        name: normalizeAttrName(String(a.name ?? "")),
        value: typeof a.value === "string" ? a.value : undefined,
      }))
    : [];

  const childNodes = Array.isArray(node.childNodes)
    ? (node.childNodes as unknown[]).map(toParsedNode)
    : [];

  const loc = node.sourceCodeLocation as
    | { startOffset?: number; endOffset?: number }
    | undefined;

  return {
    tagName:
      typeof node.tagName === "string"
        ? String(node.tagName).toLowerCase()
        : undefined,
    attrs,
    children: childNodes,
    value: typeof node.value === "string" ? node.value : undefined,
    type: nodeName,
    sourceCodeLocation: loc
      ? { startOffset: loc.startOffset, endOffset: loc.endOffset }
      : undefined,
    nodeName,
  };
}

// ─── Babel → ParsedNode ───────────────────────────────────────────────────────

function resolveAttrValue(v: unknown): string | undefined {
  if (!v || typeof v !== "object") return undefined;
  const node = v as Record<string, unknown>;
  if (node.type === "StringLiteral")
    return typeof node.value === "string" ? node.value : undefined;
  if (node.type === "NumericLiteral" || node.type === "BooleanLiteral")
    return String(node.value ?? "");
  if (node.type === "Identifier")
    return typeof node.name === "string" ? node.name : undefined;
  if (node.type === "JSXExpressionContainer")
    return resolveAttrValue(node.expression);
  return undefined;
}

function babelStart(node: Record<string, unknown>): number | undefined {
  return typeof node.start === "number" ? node.start : undefined;
}
function babelEnd(node: Record<string, unknown>): number | undefined {
  return typeof node.end === "number" ? node.end : undefined;
}

function buildTreeFromBabel(node: unknown): ParsedNode {
  if (!node || typeof node !== "object") return {};
  const cur = node as Record<string, unknown>;

  if (cur.type === "Program") {
    const body = Array.isArray(cur.body) ? cur.body : [];
    return {
      type: "Program",
      children: body.map(buildTreeFromBabel).filter(Boolean),
      start: babelStart(cur),
      end: babelEnd(cur),
    };
  }

  if (
    cur.type === "ExportNamedDeclaration" ||
    cur.type === "ExportDefaultDeclaration"
  ) {
    return buildTreeFromBabel(cur.declaration);
  }

  if (
    cur.type === "FunctionDeclaration" ||
    cur.type === "FunctionExpression" ||
    cur.type === "ArrowFunctionExpression"
  ) {
    return buildTreeFromBabel(cur.body);
  }

  if (cur.type === "BlockStatement") {
    const body = Array.isArray(cur.body) ? cur.body : [];
    return {
      type: "BlockStatement",
      children: body.map(buildTreeFromBabel).filter(Boolean),
      start: babelStart(cur),
      end: babelEnd(cur),
    };
  }

  if (cur.type === "ExpressionStatement")
    return buildTreeFromBabel(cur.expression);
  if (cur.type === "ReturnStatement") return buildTreeFromBabel(cur.argument);

  if (cur.type === "JSXElement") {
    const opening = cur.openingElement as Record<string, unknown> | undefined;
    const nameNode = opening?.name as Record<string, unknown> | undefined;
    const tagName =
      nameNode?.type === "JSXIdentifier"
        ? String(nameNode.name)
        : nameNode?.type === "JSXMemberExpression"
          ? String((nameNode.property as { name?: string })?.name ?? "")
          : "unknown";

    const attrs = Array.isArray(opening?.attributes)
      ? (opening!.attributes as Array<Record<string, unknown>>).map((a) => {
          const attrNameNode = a.name as Record<string, unknown> | undefined;
          const name =
            attrNameNode?.type === "JSXIdentifier"
              ? String(attrNameNode.name)
              : "";
          return {
            name: normalizeAttrName(name),
            value: resolveAttrValue(a.value),
          };
        })
      : [];

    const children = Array.isArray(cur.children)
      ? (cur.children as unknown[]).map(buildTreeFromBabel).filter(Boolean)
      : [];

    // Use opening tag start/end for precise diagnostic range
    const openStart = opening ? babelStart(opening) : babelStart(cur);
    const openEnd = opening ? babelEnd(opening) : babelEnd(cur);

    return {
      tagName,
      attrs,
      children,
      type: "JSXElement",
      start: openStart,
      end: openEnd,
    };
  }

  if (cur.type === "JSXFragment") {
    const children = Array.isArray(cur.children)
      ? (cur.children as unknown[]).map(buildTreeFromBabel).filter(Boolean)
      : [];
    return {
      tagName: "fragment",
      children,
      type: "JSXFragment",
      start: babelStart(cur),
      end: babelEnd(cur),
    };
  }

  if (cur.type === "JSXText") {
    return {
      value: String(cur.value ?? ""),
      type: "JSXText",
      children: [],
      start: babelStart(cur),
      end: babelEnd(cur),
    };
  }

  if (cur.type === "JSXExpressionContainer")
    return buildTreeFromBabel(cur.expression);

  if (cur.type === "StringLiteral") {
    return {
      value: String(cur.value ?? ""),
      type: "StringLiteral",
      children: [],
      start: babelStart(cur),
      end: babelEnd(cur),
    };
  }

  // Generic: recurse body if present
  const bodyChildren = Array.isArray(cur.body)
    ? (cur.body as unknown[]).map(buildTreeFromBabel).filter(Boolean)
    : [];
  return {
    type: cur.type as string | undefined,
    children: bodyChildren,
    start: babelStart(cur),
    end: babelEnd(cur),
  };
}

// ─── Public entry points ──────────────────────────────────────────────────────

export function parseBabelAst(text: string): any {
  try {
    return parseBabel(text, babelParserOptions);
  } catch {
    return { program: { type: "Program", body: [], directives: [] } };
  }
}

export function parseDocument(text: string, languageId: string): ParsedNode {
  if (languageId === "html") {
    try {
      return toParsedNode(parseHtml(text));
    } catch {
      return { children: [], type: "Document" };
    }
  }
  const ast = parseBabelAst(text);
  return buildTreeFromBabel(ast?.program ?? { type: "Program", body: [] });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function getNodeLocation(
  node: ParsedNode,
): { startOffset: number; endOffset: number } | null {
  if (
    node.sourceCodeLocation?.startOffset !== undefined &&
    node.sourceCodeLocation?.endOffset !== undefined
  ) {
    return {
      startOffset: node.sourceCodeLocation.startOffset,
      endOffset: node.sourceCodeLocation.endOffset,
    };
  }
  if (node.start !== undefined && node.end !== undefined) {
    return { startOffset: node.start, endOffset: node.end };
  }
  return null;
}

export function getAttr(node: ParsedNode, name: string): string | undefined {
  const n = normalizeAttrName(name);
  return node.attrs?.find((a) => normalizeAttrName(a.name) === n)?.value;
}

export function hasParsedAttr(node: ParsedNode, name: string): boolean {
  const n = normalizeAttrName(name);
  return (node.attrs ?? []).some((a) => normalizeAttrName(a.name) === n);
}

export function collectTextContent(node: ParsedNode): string {
  if (!node.children?.length) return node.value ?? "";
  return (node.children ?? [])
    .map((c: ParsedNode) => collectTextContent(c))
    .join(" ");
}

export function isElementNode(
  node: ParsedNode,
): node is ParsedNode & { tagName: string } {
  return Boolean(node.tagName);
}

export function isParsedTextNode(
  node: ParsedNode,
): node is ParsedNode & { value: string } {
  return (
    node.type === "StringLiteral" ||
    node.type === "JSXText" ||
    node.type === "Text" ||
    Boolean(node.value && !node.tagName)
  );
}

export function getLocRange(
  document: vscode.TextDocument,
  node:
    | {
        loc?: {
          start: { line: number; column: number };
          end: { line: number; column: number };
        };
      }
    | undefined,
): vscode.Range {
  if (!node?.loc)
    return new vscode.Range(document.positionAt(0), document.positionAt(0));
  const s = document.offsetAt(
    new vscode.Position(
      Math.max(0, node.loc.start.line - 1),
      node.loc.start.column,
    ),
  );
  const e = document.offsetAt(
    new vscode.Position(
      Math.max(0, node.loc.end.line - 1),
      node.loc.end.column,
    ),
  );
  return new vscode.Range(document.positionAt(s), document.positionAt(e));
}

// ─── parse5-specific helpers (used by HTML rules) ────────────────────────────

export function attr(node: Element, name: string): string | undefined {
  return node.attrs.find((a: Attribute) => a.name === name)?.value;
}
export function hasAttr(node: Element, name: string): boolean {
  return node.attrs.some((a: Attribute) => a.name === name);
}
export function firstAttr(
  node: Element,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const v = attr(node, name);
    if (v !== undefined) return v;
  }
  return undefined;
}
export function hasAnyAttr(node: Element, ...names: string[]): boolean {
  return names.some((n) => hasAttr(node, n));
}
export function textContent(node: Element): string {
  let text = "";
  const collect = (n: Node): void => {
    if (isTextNode(n)) text += n.value;
    if ("childNodes" in n && n.childNodes)
      for (const child of n.childNodes) collect(child);
  };
  collect(node);
  return text;
}
export function locationToRange(
  document: vscode.TextDocument,
  loc: NodeLocation | null | undefined,
): vscode.Range {
  if (!loc)
    return new vscode.Range(document.positionAt(0), document.positionAt(0));
  return new vscode.Range(
    document.positionAt(loc.startOffset),
    document.positionAt(loc.endOffset),
  );
}
export function openingTagLocation(node: Element): NodeLocation | null {
  const loc = (node as unknown as Record<string, unknown>)
    .sourceCodeLocation as
    | (NodeLocation & { startTag?: NodeLocation })
    | undefined;
  if (!loc) return null;
  return loc.startTag ?? loc;
}
export function isElement(node: Node): node is Element {
  return (node as Element).tagName !== undefined;
}
export function isTextNode(node: Node): node is TextNode {
  return node.nodeName === "#text";
}
