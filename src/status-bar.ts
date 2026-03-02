import * as vscode from "vscode";

export class StatusBarController {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.item.command = "or.fetchBundle";
    this.reset();
    this.item.show();
  }

  setBundleCount(count: number): void {
    this.item.text = `$(symbol-structure) OR (${count})`;
    this.item.tooltip = `${count} bundle(s) loaded\nClick to add a new bundle`;
  }

  reset(): void {
    this.item.text = "$(symbol-structure) OR";
    this.item.tooltip = "Click to fetch an execution bundle";
  }

  dispose(): void {
    this.item.dispose();
  }
}
