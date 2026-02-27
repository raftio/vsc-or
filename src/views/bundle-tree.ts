import * as vscode from "vscode";
import type { ExecutionBundle, SynthesizedContext } from "../types";

type NodeKind =
  | "root"
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
  taskId?: string;
}

export class BundleTreeProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private bundle: ExecutionBundle | null = null;
  private context: SynthesizedContext | null = null;
  private roots: TreeNode[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setData(
    bundle: ExecutionBundle | null,
    ctx: SynthesizedContext | null,
  ): void {
    this.bundle = bundle;
    this.context = ctx;
    this.roots = this.buildRoots();
    this.refresh();
  }

  clear(): void {
    this.bundle = null;
    this.context = null;
    this.roots = [];
    this.refresh();
  }

  getBundle(): ExecutionBundle | null {
    return this.bundle;
  }

  getContext(): SynthesizedContext | null {
    return this.context;
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.children?.length
        ? element.collapsible === false
          ? vscode.TreeItemCollapsibleState.None
          : vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );
    if (element.description) {
      item.description = element.description;
    }
    if (element.tooltip) {
      item.tooltip = new vscode.MarkdownString(element.tooltip);
    }
    item.iconPath = this.iconFor(element.kind);
    if (element.kind === "task" && element.taskId) {
      item.contextValue = "task";
      item.command = {
        command: "orqestra.executeTask",
        title: "Execute Task",
        arguments: [element.taskId],
      };
    }
    return item;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.roots;
    }
    return element.children ?? [];
  }

  private buildRoots(): TreeNode[] {
    const roots: TreeNode[] = [];

    if (this.context) {
      roots.push({
        kind: "info",
        label: this.context.ticket_title,
        description: this.bundle?.ticket_ref,
        tooltip: this.context.ticket_description || undefined,
      });
    }

    if (this.bundle?.tasks.length) {
      const depMap = new Map<string, string[]>();
      for (const d of this.bundle.dependencies ?? []) {
        const list = depMap.get(d.taskId) ?? [];
        list.push(d.dependsOn);
        depMap.set(d.taskId, list);
      }

      roots.push({
        kind: "section",
        label: `Tasks (${this.bundle.tasks.length})`,
        children: this.bundle.tasks.map((t) => {
          const deps = depMap.get(t.id);
          const desc = deps ? `depends on: ${deps.join(", ")}` : undefined;
          return {
            kind: "task" as NodeKind,
            label: t.title,
            description: desc,
            tooltip: t.description || undefined,
            taskId: t.id,
          };
        }),
      });
    }

    const acs = this.context?.acceptance_criteria;
    if (acs?.length) {
      roots.push({
        kind: "section",
        label: `Acceptance Criteria (${acs.length})`,
        children: acs.map((ac) => ({
          kind: "ac" as NodeKind,
          label: ac.id,
          description: ac.description,
          tooltip: ac.description,
        })),
      });
    }

    const excerpts = this.context?.excerpts ?? this.bundle?.context?.excerpts;
    if (excerpts?.length) {
      roots.push({
        kind: "section",
        label: `Context (${excerpts.length})`,
        children: excerpts.map((e) => ({
          kind: "excerpt" as NodeKind,
          label: e.length > 80 ? e.slice(0, 80) + "..." : e,
          tooltip: e,
        })),
      });
    }

    if (roots.length === 0) {
      roots.push({
        kind: "info",
        label: "No bundle loaded",
        description: "Use 'Orqestra: Fetch Bundle' to get started",
      });
    }

    return roots;
  }

  private iconFor(kind: NodeKind): vscode.ThemeIcon {
    switch (kind) {
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
