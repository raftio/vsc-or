import * as vscode from "vscode";
import type {
  ExecutionBundle,
  SynthesizedContext,
  Workspace,
} from "../types";

type NodeKind =
  | "workspace"
  | "bundle"
  | "section"
  | "task"
  | "ac"
  | "excerpt"
  | "info";

export interface TreeNode {
  kind: NodeKind;
  label: string;
  description?: string;
  tooltip?: string;
  children?: TreeNode[];
  collapsible?: boolean;
  bundleId?: string;
  taskId?: string;
  workspaceId?: string;
}

export interface BundleEntry {
  bundle: ExecutionBundle;
  context: SynthesizedContext | null;
}

export interface WorkspaceEntry {
  workspace: Workspace;
  bundles: BundleEntry[];
}

export class BundleTreeProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private wsEntries: WorkspaceEntry[] = [];
  private roots: TreeNode[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setWorkspaces(entries: WorkspaceEntry[]): void {
    this.wsEntries = entries;
    this.roots = this.buildRoots();
    this.refresh();
  }

  /** @deprecated use setWorkspaces */
  setBundles(entries: BundleEntry[]): void {
    this.wsEntries = [
      {
        workspace: {
          id: "_legacy",
          name: "Bundles",
          slug: "bundles",
          owner_id: "",
          role: "member",
          member_count: 0,
          created_at: "",
        },
        bundles: entries,
      },
    ];
    this.roots = this.buildRoots();
    this.refresh();
  }

  addBundle(
    workspaceId: string,
    bundle: ExecutionBundle,
    ctx: SynthesizedContext | null,
  ): void {
    const ws = this.wsEntries.find((e) => e.workspace.id === workspaceId);
    if (!ws) return;
    const idx = ws.bundles.findIndex((e) => e.bundle.id === bundle.id);
    if (idx >= 0) {
      ws.bundles[idx] = { bundle, context: ctx };
    } else {
      ws.bundles.unshift({ bundle, context: ctx });
    }
    this.roots = this.buildRoots();
    this.refresh();
  }

  clear(): void {
    this.wsEntries = [];
    this.roots = [];
    this.refresh();
  }

  getBundle(bundleId: string): ExecutionBundle | null {
    for (const ws of this.wsEntries) {
      const found = ws.bundles.find((e) => e.bundle.id === bundleId);
      if (found) return found.bundle;
    }
    return null;
  }

  getBundleContext(bundleId: string): SynthesizedContext | null {
    for (const ws of this.wsEntries) {
      const found = ws.bundles.find((e) => e.bundle.id === bundleId);
      if (found) return found.context;
    }
    return null;
  }

  getAllEntries(): BundleEntry[] {
    return this.wsEntries.flatMap((ws) => ws.bundles);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const state = element.children?.length
      ? element.kind === "workspace" || element.kind === "bundle"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.None;

    const item = new vscode.TreeItem(element.label, state);

    if (element.description) {
      item.description = element.description;
    }
    if (element.tooltip) {
      item.tooltip = new vscode.MarkdownString(element.tooltip);
    }

    item.iconPath = this.iconFor(element.kind);

    if (element.kind === "workspace") {
      item.contextValue = "workspace";
    } else if (element.kind === "bundle") {
      item.contextValue = "bundle";
    } else if (element.kind === "task" && element.taskId) {
      item.contextValue = "task";
    }

    return item;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) return this.roots;
    return element.children ?? [];
  }

  private buildRoots(): TreeNode[] {
    if (this.wsEntries.length === 0) {
      return [];
    }

    return this.wsEntries.map((entry) => this.buildWorkspaceNode(entry));
  }

  private buildWorkspaceNode({ workspace, bundles }: WorkspaceEntry): TreeNode {
    const bundleNodes =
      bundles.length > 0
        ? bundles.map((be) => this.buildBundleNode(be))
        : [
            {
              kind: "info" as NodeKind,
              label: "No bundles",
              workspaceId: workspace.id,
            },
          ];

    return {
      kind: "workspace",
      label: workspace.name,
      description: `${bundles.length} bundle(s)`,
      tooltip: `Workspace: ${workspace.name} (${workspace.slug})`,
      workspaceId: workspace.id,
      children: bundleNodes,
    };
  }

  private buildBundleNode({ bundle, context }: BundleEntry): TreeNode {
    const children: TreeNode[] = [];

    if (bundle.tasks.length) {
      const depMap = new Map<string, string[]>();
      for (const d of bundle.dependencies ?? []) {
        const list = depMap.get(d.taskId) ?? [];
        list.push(d.dependsOn);
        depMap.set(d.taskId, list);
      }

      children.push({
        kind: "section",
        label: `Tasks (${bundle.tasks.length})`,
        bundleId: bundle.id,
        children: bundle.tasks.map((t) => {
          const deps = depMap.get(t.id);
          const desc = deps ? `depends on: ${deps.join(", ")}` : undefined;
          return {
            kind: "task" as NodeKind,
            label: t.title,
            description: desc,
            tooltip: t.description || undefined,
            bundleId: bundle.id,
            taskId: t.id,
          };
        }),
      });
    }

    const acs = context?.acceptance_criteria;
    if (acs?.length) {
      children.push({
        kind: "section",
        label: `Acceptance Criteria (${acs.length})`,
        bundleId: bundle.id,
        children: acs.map((ac) => ({
          kind: "ac" as NodeKind,
          label: ac.id,
          description: ac.description,
          tooltip: ac.description,
          bundleId: bundle.id,
        })),
      });
    }

    const excerpts = context?.excerpts ?? bundle.context?.excerpts;
    if (excerpts?.length) {
      children.push({
        kind: "section",
        label: `Context (${excerpts.length})`,
        bundleId: bundle.id,
        children: excerpts.map((e) => ({
          kind: "excerpt" as NodeKind,
          label: e.length > 80 ? e.slice(0, 80) + "..." : e,
          tooltip: e,
          bundleId: bundle.id,
        })),
      });
    }

    const title = bundle.title || context?.ticket_title;
    const ticketLabel = title || bundle.ticket_ref;
    const desc = title
      ? `${bundle.ticket_ref} · v${bundle.version} · ${bundle.tasks.length} task(s)`
      : `v${bundle.version} · ${bundle.tasks.length} task(s)`;

    return {
      kind: "bundle",
      label: ticketLabel,
      description: desc,
      tooltip: context?.ticket_description || `Bundle ${bundle.id}`,
      bundleId: bundle.id,
      children,
    };
  }

  private iconFor(kind: NodeKind): vscode.ThemeIcon {
    switch (kind) {
      case "workspace":
        return new vscode.ThemeIcon("briefcase");
      case "bundle":
        return new vscode.ThemeIcon("package");
      case "section":
        return new vscode.ThemeIcon("symbol-folder");
      case "task":
        return new vscode.ThemeIcon("tasklist");
      case "ac":
        return new vscode.ThemeIcon("checklist");
      case "excerpt":
        return new vscode.ThemeIcon("note");
      case "info":
        return new vscode.ThemeIcon("info");
      default:
        return new vscode.ThemeIcon("circle-outline");
    }
  }
}
