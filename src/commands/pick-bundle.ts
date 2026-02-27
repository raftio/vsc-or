import * as vscode from "vscode";
import * as api from "../api-client";
import type { ExecutionBundle } from "../types";
import type { BundleTreeProvider } from "../views/bundle-tree";
import type { StatusBarController } from "../status-bar";

interface BundleQuickPickItem extends vscode.QuickPickItem {
  bundle?: ExecutionBundle;
  action?: "build-new";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toBundleItems(bundles: ExecutionBundle[]): BundleQuickPickItem[] {
  return bundles.map((b) => ({
    label: b.ticket_ref,
    description: `v${b.version} — ${b.tasks.length} task(s)`,
    detail: `Created ${formatDate(b.created_at)}  |  id: ${b.id.slice(0, 8)}…`,
    bundle: b,
  }));
}

async function loadBundle(
  bundle: ExecutionBundle,
  tree: BundleTreeProvider,
  statusBar: StatusBarController,
): Promise<void> {
  const ctx = await api.getContext(bundle.ticket_ref).catch(() => null);
  tree.setData(bundle, ctx);
  statusBar.setTicket(bundle.ticket_ref, bundle.id);
  vscode.window.showInformationMessage(
    `Bundle loaded: ${bundle.tasks.length} task(s) for ${bundle.ticket_ref}`,
  );
}

async function buildNewFlow(
  tree: BundleTreeProvider,
  statusBar: StatusBarController,
): Promise<void> {
  const ticketId = await vscode.window.showInputBox({
    prompt: "Enter ticket ID (e.g. PROJ-123)",
    placeHolder: "PROJ-123",
    ignoreFocusOut: true,
  });
  if (!ticketId) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Building bundle for ${ticketId}...`,
      cancellable: false,
    },
    async () => {
      const bundle = await api.buildBundle(ticketId);
      await loadBundle(bundle, tree, statusBar);
    },
  );
}

export function createPickBundleCommand(
  tree: BundleTreeProvider,
  statusBar: StatusBarController,
) {
  return async () => {
    try {
      const { bundles } = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading bundles…",
          cancellable: false,
        },
        () => api.listBundles(),
      );

      const buildNewItem: BundleQuickPickItem = {
        label: "$(add) Build new from ticket…",
        description: "",
        action: "build-new",
        alwaysShow: true,
      };

      const items: BundleQuickPickItem[] = [
        buildNewItem,
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        ...toBundleItems(bundles),
      ];

      if (bundles.length === 0) {
        items.push({
          label: "No bundles yet",
          description: "Build one using the option above",
        });
      }

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a bundle or build a new one",
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (!picked) return;

      if (picked.action === "build-new") {
        await buildNewFlow(tree, statusBar);
        return;
      }

      if (picked.bundle) {
        await loadBundle(picked.bundle, tree, statusBar);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to load bundles: ${msg}`);
    }
  };
}
