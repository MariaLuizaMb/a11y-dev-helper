// src/extension.ts
import * as vscode from "vscode";
import { allRules } from "./rules";
import { parseDocument } from "./utils/htmlAst";
import { log, logError, logSummary, disposeChannel } from "./utils/logger";
import { updateStatusBar, disposeStatusBar } from "./utils/statusBar";
import { A11yHoverProvider } from "./providers/hoverProvider";
import { A11yQuickFixProvider } from "./providers/quickFixProvider";

const SUPPORTED_LANGUAGES = new Set([
  "html",
  "javascriptreact",
  "typescriptreact",
]);

const SUPPORTED_SELECTORS: vscode.DocumentSelector = [
  { language: "html" },
  { language: "javascriptreact" },
  { language: "typescriptreact" },
];

function analyzeDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): void {
  const supported = SUPPORTED_LANGUAGES.has(document.languageId);

  if (!supported) {
    collection.delete(document.uri);
    updateStatusBar(0, false);
    return;
  }

  const text = document.getText();
  const fileName = document.fileName.split(/[\\/]/).pop() ?? document.fileName;
  const t0 = Date.now();

  let ast;
  try {
    ast = parseDocument(text, document.languageId);
  } catch (err) {
    logError("parseDocument", err);
    ast = undefined;
  }

  const config = vscode.workspace.getConfiguration("a11yDevHelper");
  const rulesConfig = config.get<Record<string, boolean>>("rules") ?? {};

  const enabledRules = allRules.filter((r) => rulesConfig[r.id] !== false);

  const allDiagnostics = enabledRules.flatMap((rule) => {
    try {
      return rule.check(text, document, ast).map((d) => {
        d.code = rule.id;
        d.source = "A11y Dev Helper";
        return d;
      });
    } catch (err) {
      logError(rule.id, err);
      return [];
    }
  });

  collection.set(document.uri, allDiagnostics);
  updateStatusBar(allDiagnostics.length, true);
  logSummary(
    fileName,
    enabledRules.length,
    allDiagnostics.length,
    Date.now() - t0,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  log("A11y Dev Helper activated");

  const collection =
    vscode.languages.createDiagnosticCollection("a11y-dev-helper");

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Initial analysis ────────────────────────────────────────────────────
  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document, collection);
  }

  // ── Register providers ──────────────────────────────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider(
    SUPPORTED_SELECTORS,
    new A11yHoverProvider(collection),
  );

  const quickFixProvider = vscode.languages.registerCodeActionsProvider(
    SUPPORTED_SELECTORS,
    new A11yQuickFixProvider(),
    { providedCodeActionKinds: A11yQuickFixProvider.providedCodeActionKinds },
  );

  // ── Event listeners ─────────────────────────────────────────────────────
  context.subscriptions.push(
    collection,
    hoverProvider,
    quickFixProvider,

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        analyzeDocument(editor.document, collection);
      } else {
        updateStatusBar(0, false);
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
  disposeStatusBar();
  disposeChannel();
}
