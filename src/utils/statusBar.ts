// src/utils/statusBar.ts
import * as vscode from "vscode";

let _item: vscode.StatusBarItem | undefined;

/**
 * Creates (or returns existing) the status bar item.
 * Shows the number of a11y issues in the current file.
 */
export function getStatusBarItem(): vscode.StatusBarItem {
  if (!_item) {
    _item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      90,
    );
    _item.command = "workbench.actions.view.problems";
    _item.tooltip = "A11y Dev Helper — clique para abrir o painel Problems";
    _item.show();
  }
  return _item;
}

export function updateStatusBar(diagCount: number, supported: boolean): void {
  const item = getStatusBarItem();
  if (!supported) {
    item.text = "";
    item.hide();
    return;
  }
  item.show();
  if (diagCount === 0) {
    item.text = "$(check) a11y";
    item.backgroundColor = undefined;
  } else {
    item.text = `$(warning) ${diagCount} a11y`;
    item.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    );
  }
}

export function disposeStatusBar(): void {
  _item?.dispose();
  _item = undefined;
}
