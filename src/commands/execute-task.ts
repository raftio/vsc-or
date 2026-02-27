import * as vscode from "vscode";
import type { BundleTreeProvider } from "../views/bundle-tree";
import { composeTaskPrompt, composeBundlePrompt } from "../prompt";

function openCursorChat(query: string): Thenable<unknown> {
  return vscode.commands.executeCommand("workbench.action.chat.open", {
    query,
  });
}

export function createExecuteTaskCommand(tree: BundleTreeProvider) {
  return async (taskId?: string) => {
    const bundle = tree.getBundle();
    if (!bundle) {
      vscode.window.showWarningMessage(
        "No bundle loaded. Use 'Orqestra: Fetch Bundle' first.",
      );
      return;
    }

    let resolvedTaskId = taskId;

    if (!resolvedTaskId) {
      const items = bundle.tasks.map((t) => ({
        label: t.title,
        description: t.id,
        taskId: t.id,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a task to execute",
      });
      if (!picked) return;
      resolvedTaskId = picked.taskId;
    }

    const task = bundle.tasks.find((t) => t.id === resolvedTaskId);
    if (!task) {
      vscode.window.showErrorMessage(`Task "${resolvedTaskId}" not found in bundle.`);
      return;
    }

    const ctx = tree.getContext();
    const prompt = composeTaskPrompt(task, bundle, ctx);
    await openCursorChat(prompt);
  };
}

export function createExecuteBundleCommand(tree: BundleTreeProvider) {
  return async () => {
    const bundle = tree.getBundle();
    if (!bundle) {
      vscode.window.showWarningMessage(
        "No bundle loaded. Use 'Orqestra: Fetch Bundle' first.",
      );
      return;
    }

    const ctx = tree.getContext();
    const prompt = composeBundlePrompt(bundle, ctx);
    await openCursorChat(prompt);
  };
}
