// src/extension.ts
import * as vscode from "vscode";
import { allRules } from "./rules";

const SUPPORTED_LANGUAGES = new Set([
  "html",
  "javascriptreact",
  "typescriptreact",
]);

function analyzeDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): void {
  if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
    collection.delete(document.uri);
    return;
  }

  const text = document.getText();
  const config = vscode.workspace.getConfiguration("a11yDevHelper");
  const rulesConfig = config.get<Record<string, boolean>>("rules") ?? {};

  const allDiagnostics = allRules
    .filter((rule) => rulesConfig[rule.id] !== false)
    .flatMap((rule) =>
      rule.check(text, document).map((diagnostic) => {
        diagnostic.code = rule.id;
        return diagnostic;
      }),
    );

  collection.set(document.uri, allDiagnostics);
}

export function activate(context: vscode.ExtensionContext): void {
  const collection =
    vscode.languages.createDiagnosticCollection("a11y-dev-helper");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document, collection);
  }

  context.subscriptions.push(
    collection,
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        analyzeDocument(editor.document, collection);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        analyzeDocument(event.document, collection);
      }, 500);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      collection.delete(document.uri);
    }),
  );
}

export function deactivate(): void {
  // Subscriptions are disposed automatically by VS Code.
}
