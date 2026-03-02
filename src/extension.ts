import * as vscode from "vscode";
import { BundleTreeProvider } from "./views/bundle-tree";
import type { BundleEntry } from "./views/bundle-tree";
import * as api from "./api-client";
import { createFetchBundleCommand } from "./commands/pick-bundle";
import { createSubmitEvidenceCommand } from "./commands/submit-evidence";
import {
  createExecuteTaskCommand,
  createExecuteBundleCommand,
} from "./commands/execute-task";
import { reviewNewBundle } from "./commands/review-bundle";
import { StatusBarController } from "./status-bar";

const REVIEWED_KEY = "orca.reviewedBundleIds";

async function loadAllBundles(
  tree: BundleTreeProvider,
  statusBar: StatusBarController,
  extContext: vscode.ExtensionContext,
): Promise<void> {
  try {
    const { bundles } = await api.listBundles();

    const reviewedIds = extContext.workspaceState.get<string[]>(REVIEWED_KEY) ?? [];
    const reviewedSet = new Set(reviewedIds);
    const hasNew = bundles.some((b) => !reviewedSet.has(b.id));

    const entries: BundleEntry[] = await Promise.all(
      bundles.map(async (bundle) => ({
        bundle,
        context: await api.getContext(bundle.ticket_ref).catch(() => null),
      })),
    );

    if (hasNew) {
      const updatedEntries: BundleEntry[] = [];

      for (const entry of entries) {
        if (!reviewedSet.has(entry.bundle.id)) {
          const { bundle: adjusted, included } = await reviewNewBundle(entry.bundle);
          reviewedSet.add(entry.bundle.id);
          if (included) {
            updatedEntries.push({ bundle: adjusted, context: entry.context });
          }
        } else {
          updatedEntries.push(entry);
        }
      }

      await extContext.workspaceState.update(REVIEWED_KEY, [...reviewedSet]);
      tree.setBundles(updatedEntries);
      statusBar.setBundleCount(updatedEntries.length);
    } else {
      tree.setBundles(entries);
      statusBar.setBundleCount(entries.length);
    }
  } catch {
    // API not available — leave tree empty
  }
}

export function activate(context: vscode.ExtensionContext) {
  const tree = new BundleTreeProvider();
  const statusBar = new StatusBarController();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("orca.bundleTree", tree),
    statusBar,
  );

  const reload = () => loadAllBundles(tree, statusBar, context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "orca.fetchBundle",
      createFetchBundleCommand(reload),
    ),
    vscode.commands.registerCommand("orca.refreshBundle", reload),
    vscode.commands.registerCommand(
      "orca.submitEvidence",
      createSubmitEvidenceCommand(tree),
    ),
    vscode.commands.registerCommand(
      "orca.executeTask",
      createExecuteTaskCommand(tree),
    ),
    vscode.commands.registerCommand(
      "orca.executeBundle",
      createExecuteBundleCommand(tree),
    ),
    vscode.commands.registerCommand("orca.disconnect", () => {
      tree.clear();
      statusBar.reset();
      vscode.window.showInformationMessage("OR: disconnected.");
    }),
  );

  reload();
}

export function deactivate() {}
