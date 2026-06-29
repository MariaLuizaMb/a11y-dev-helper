// src/test/helpers.ts
import * as vscode from "vscode";

/**
 * Creates a minimal fake TextDocument for unit testing rules.
 * Does not require an open VS Code workspace or editor.
 */
export function fakeDocument(
  content: string,
  languageId: "html" | "javascriptreact" | "typescriptreact" = "html",
): vscode.TextDocument {
  const lines = content.split("\n");
  return {
    getText: () => content,
    languageId,
    uri: vscode.Uri.parse(
      `untitled://test.${languageId === "html" ? "html" : "jsx"}`,
    ),
    positionAt(offset: number): vscode.Position {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // +1 for \n
        if (remaining < lineLen) {
          return new vscode.Position(i, remaining);
        }
        remaining -= lineLen;
      }
      return new vscode.Position(
        lines.length - 1,
        lines[lines.length - 1].length,
      );
    },
    offsetAt(position: vscode.Position): number {
      let offset = 0;
      for (let i = 0; i < position.line; i++) {
        offset += lines[i].length + 1;
      }
      return offset + position.character;
    },
    lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
      const lineNum =
        typeof lineOrPosition === "number"
          ? lineOrPosition
          : lineOrPosition.line;
      const text = lines[lineNum] ?? "";
      return {
        lineNumber: lineNum,
        text,
        range: new vscode.Range(lineNum, 0, lineNum, text.length),
        rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
        firstNonWhitespaceCharacterIndex: text.search(/\S/),
        isEmptyOrWhitespace: text.trim().length === 0,
      };
    },
    lineCount: lines.length,
    fileName: `test.${languageId === "html" ? "html" : "jsx"}`,
    isUntitled: true,
    version: 1,
    isDirty: false,
    isClosed: false,
    encoding: "utf8",
    eol: vscode.EndOfLine.LF,
    save: () => Promise.resolve(true),
    getWordRangeAtPosition: () => undefined,
    validateRange: (r: vscode.Range) => r,
    validatePosition: (p: vscode.Position) => p,
  } as unknown as vscode.TextDocument;
}

/** Assert that a rule finds at least `minCount` diagnostics in the given source. */
export function assertFinds(
  diagnostics: vscode.Diagnostic[],
  minCount: number,
  label: string,
): void {
  if (diagnostics.length < minCount) {
    throw new Error(
      `[${label}] expected ≥${minCount} diagnostic(s), got ${diagnostics.length}`,
    );
  }
}

/** Assert that a rule finds zero diagnostics in the given source. */
export function assertClean(
  diagnostics: vscode.Diagnostic[],
  label: string,
): void {
  if (diagnostics.length !== 0) {
    const msgs = diagnostics.map((d) => `  • ${d.message}`).join("\n");
    throw new Error(
      `[${label}] expected 0 diagnostics, got ${diagnostics.length}:\n${msgs}`,
    );
  }
}
