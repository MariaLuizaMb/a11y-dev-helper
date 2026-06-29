// src/rules/videoTrack.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";
import {
  parseHtml,
  walkTree,
  attr,
  openingTagLocation,
  isElement,
} from "../utils/htmlAst";

/**
 * Detects <video> elements without a <track kind="captions"> or
 * <track kind="subtitles"> child element.
 *
 * Uses parse5 for HTML files — correctly handles nested elements and
 * eliminates false positives from the regex approach.
 *
 * WCAG 1.2.2 Captions (Prerecorded) (Level A)
 */
export const videoTrackRule: A11yRule = {
  id: "video-missing-track",
  check(text, document) {
    if (document.languageId === "html") {
      return checkWithAst(text, document);
    }
    return checkWithRegex(text, document);
  },
};

// ─── AST strategy (HTML) ─────────────────────────────────────────────────────

function checkWithAst(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const tree = parseHtml(text);

  walkTree(tree, (node) => {
    if (node.tagName !== "video") {
      return;
    }

    // Check all descendants for a qualifying <track> element
    let hasCaptionTrack = false;

    walkTree(node, (child) => {
      if (child.tagName !== "track") {
        return;
      }
      const kind = attr(child, "kind")?.toLowerCase();
      if (kind === "captions" || kind === "subtitles") {
        hasCaptionTrack = true;
      }
    });

    if (hasCaptionTrack) {
      return;
    }

    const loc = openingTagLocation(node);
    const range = loc
      ? new vscode.Range(
          document.positionAt(loc.startOffset),
          document.positionAt(loc.endOffset),
        )
      : new vscode.Range(document.positionAt(0), document.positionAt(0));

    diagnostics.push(
      new vscode.Diagnostic(
        range,
        'Vídeo sem legenda. Adicione um elemento track com kind="captions" ou kind="subtitles" para tornar o conteúdo acessível a pessoas surdas ou com dificuldade auditiva.',
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  });

  return diagnostics;
}

// ─── Regex fallback (JSX / TSX) ──────────────────────────────────────────────

function checkWithRegex(
  text: string,
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  /**
   * NOTE: Regex fallback for JSX/TSX. Replace with @babel/parser in a future phase.
   */
  const videoRegex = /<video\b[^>]*>([\s\S]*?)<\/video>/gi;
  const trackRegex =
    /<track\b[^>]*\bkind\s*=\s*(["'])(?:captions|subtitles)\1[^>]*>/i;

  return [...text.matchAll(videoRegex)].flatMap((match) => {
    if (trackRegex.test(match[1] ?? "")) {
      return [];
    }
    return [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        'Vídeo sem legenda. Adicione um elemento track com kind="captions" ou kind="subtitles" para tornar o conteúdo acessível a pessoas surdas ou com dificuldade auditiva.',
        vscode.DiagnosticSeverity.Warning,
      ),
    ];
  });
}
