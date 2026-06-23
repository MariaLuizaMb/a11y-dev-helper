// src/rules/videoTrack.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects <video> elements without a <track kind="captions"> or <track kind="subtitles"> child. */
export const videoTrackRule: A11yRule = {
  id: "video-missing-track",
  check(text, document) {
    /**
     * Matches full <video>...</video> blocks and captures inner content.
     * NOTE: Regex is used for MVP. Does not handle self-closing or dynamically injected tracks.
     * Replace with AST parsing for accurate detection.
     */
    const videoRegex = /<video\b[^>]*>([\s\S]*?)<\/video>/gi;

    /**
     * Detects a <track> element with kind="captions" or kind="subtitles".
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate child detection.
     */
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
          'Vídeo sem legenda. Adicione um elemento <track kind="captions"> ou <track kind="subtitles"> para tornar o conteúdo acessível a pessoas surdas ou com dificuldade auditiva.',
          vscode.DiagnosticSeverity.Warning,
        ),
      ];
    });
  },
};
