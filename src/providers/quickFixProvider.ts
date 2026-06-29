// src/providers/quickFixProvider.ts
import * as vscode from "vscode";

/**
 * CodeActionProvider — Quick Fix for rules with deterministic corrections.
 *
 * Supported rules:
 *  img-missing-alt         → inserts alt=""
 *  html-missing-lang       → inserts lang="pt-BR"
 *  iframe-missing-title    → inserts title=""
 *  link-generic-text       → places cursor on link text for manual edit
 *  tabindex-positive        → replaces value with 0
 *  button-missing-name     → inserts aria-label=""
 *  button-emoji-only       → inserts aria-label=""
 *  autofocus               → removes the autofocus attribute
 */
export class A11yQuickFixProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diag of context.diagnostics) {
      const ruleId = typeof diag.code === "string" ? diag.code : "";

      switch (ruleId) {
        case "img-missing-alt":
          actions.push(
            this.insertAttrFix(document, diag, 'alt=""', 'Adicionar alt=""'),
          );
          break;

        case "html-missing-lang":
          actions.push(
            this.insertAttrFix(
              document,
              diag,
              'lang="pt-BR"',
              'Adicionar lang="pt-BR"',
            ),
          );
          break;

        case "iframe-missing-title":
          actions.push(
            this.insertAttrFix(
              document,
              diag,
              'title=""',
              'Adicionar title=""',
            ),
          );
          break;

        case "button-missing-name":
        case "button-emoji-only":
        case "button-only-svg":
          actions.push(
            this.insertAttrFix(
              document,
              diag,
              'aria-label=""',
              'Adicionar aria-label=""',
            ),
          );
          break;

        case "autofocus":
          actions.push(
            this.removeTextFix(
              document,
              diag,
              "autofocus",
              "Remover autofocus",
            ),
          );
          actions.push(
            this.removeTextFix(
              document,
              diag,
              "autoFocus",
              "Remover autoFocus",
            ),
          );
          break;

        case "tabindex-positive":
          actions.push(this.replaceTabIndexFix(document, diag));
          break;

        case "link-generic-text":
          actions.push(
            this.selectContentFix(
              document,
              diag,
              "Selecionar texto do link para editar",
            ),
          );
          break;

        case "input-missing-label":
        case "input-placeholder-no-label":
        case "select-missing-label":
          actions.push(
            this.insertAttrFix(
              document,
              diag,
              'aria-label=""',
              'Adicionar aria-label=""',
            ),
          );
          break;
      }
    }

    return actions;
  }

  // ── Fix builders ───────────────────────────────────────────────────────────

  /**
   * Inserts an attribute just before the first `>` or `/>` of the opening tag.
   */
  private insertAttrFix(
    document: vscode.TextDocument,
    diag: vscode.Diagnostic,
    attr: string,
    title: string,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diag];
    action.isPreferred = true;

    const tagText = document.getText(diag.range);
    // Find the close of the opening tag within the range
    const closeIdx = tagText.search(/\s*\/?>$/);
    const insertPos =
      closeIdx >= 0
        ? document.positionAt(document.offsetAt(diag.range.start) + closeIdx)
        : diag.range.end;

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, insertPos, ` ${attr}`);
    action.edit = edit;
    return action;
  }

  /**
   * Removes a specific text token (e.g. "autofocus") from the diagnostic range.
   */
  private removeTextFix(
    document: vscode.TextDocument,
    diag: vscode.Diagnostic,
    token: string,
    title: string,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diag];
    action.isPreferred = true;

    const text = document.getText();
    const offset = document.offsetAt(diag.range.start);
    const idx = text.indexOf(token, offset);
    if (idx === -1) return action;

    const edit = new vscode.WorkspaceEdit();
    const start = document.positionAt(idx);
    const end = document.positionAt(idx + token.length);
    edit.delete(document.uri, new vscode.Range(start, end));
    action.edit = edit;
    return action;
  }

  /**
   * Replaces tabIndex={N} or tabindex="N" with tabIndex={0}.
   */
  private replaceTabIndexFix(
    document: vscode.TextDocument,
    diag: vscode.Diagnostic,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Alterar tabIndex para 0",
      vscode.CodeActionKind.QuickFix,
    );
    action.diagnostics = [diag];
    action.isPreferred = true;

    const tagText = document.getText(diag.range);
    const match = tagText.match(
      /\btabIndex\s*=\s*\{[^}]+\}|\btabindex\s*=\s*(["'])[^"']+\1/i,
    );
    if (!match || match.index === undefined) return action;

    const startOffset = document.offsetAt(diag.range.start) + match.index;
    const start = document.positionAt(startOffset);
    const end = document.positionAt(startOffset + match[0].length);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(start, end), "tabIndex={0}");
    action.edit = edit;
    return action;
  }

  /**
   * Selects the inner text of a link so the user can type a replacement.
   */
  private selectContentFix(
    document: vscode.TextDocument,
    diag: vscode.Diagnostic,
    title: string,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diag];

    const tagText = document.getText(diag.range);
    const innerMatch = tagText.match(/>([^<]+)</);
    if (!innerMatch || innerMatch.index === undefined) return action;

    const innerStart =
      document.offsetAt(diag.range.start) + innerMatch.index + 1;
    const start = document.positionAt(innerStart);
    const end = document.positionAt(innerStart + innerMatch[1].length);

    action.command = {
      command: "editor.action.setSelection",
      title,
      arguments: [{ start, end }],
    };
    return action;
  }
}
