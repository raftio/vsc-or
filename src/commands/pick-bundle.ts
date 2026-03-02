import * as vscode from "vscode";

export function createFetchBundleCommand(reload: () => Promise<void>) {
  return async () => {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Loading bundles…",
        cancellable: false,
      },
      reload,
    );
  };
}
