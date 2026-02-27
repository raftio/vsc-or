import * as vscode from "vscode";
import { BundleTreeProvider } from "./views/bundle-tree";
import { createRefreshBundleCommand } from "./commands/fetch-bundle";
import { createPickBundleCommand } from "./commands/pick-bundle";
import { createSubmitEvidenceCommand } from "./commands/submit-evidence";
import {
  createExecuteTaskCommand,
  createExecuteBundleCommand,
} from "./commands/execute-task";
import { StatusBarController } from "./status-bar";

export function activate(context: vscode.ExtensionContext) {
  const tree = new BundleTreeProvider();
  const statusBar = new StatusBarController();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("orqestra.bundleTree", tree),
    statusBar,
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orqestra.fetchBundle",
      createPickBundleCommand(tree, statusBar),
    ),
    vscode.commands.registerCommand(
      "orqestra.refreshBundle",
      createRefreshBundleCommand(tree, statusBar),
    ),
    vscode.commands.registerCommand(
      "orqestra.submitEvidence",
      createSubmitEvidenceCommand(tree),
    ),
    vscode.commands.registerCommand(
      "orqestra.executeTask",
      createExecuteTaskCommand(tree),
    ),
    vscode.commands.registerCommand(
      "orqestra.executeBundle",
      createExecuteBundleCommand(tree),
    ),
    vscode.commands.registerCommand("orqestra.disconnect", () => {
      tree.clear();
      statusBar.reset();
      vscode.window.showInformationMessage("Orqestra: disconnected.");
    }),
  );
}

export function deactivate() {}
