import * as vscode from "vscode";
import type { AuthUser } from "./types";

const TOKEN_KEY = "or.jwt";
const USER_KEY = "or.user";

let secrets: vscode.SecretStorage | undefined;

export function init(context: vscode.ExtensionContext): void {
  secrets = context.secrets;
}

export async function storeSession(
  token: string,
  user: AuthUser,
): Promise<void> {
  if (!secrets) throw new Error("Auth not initialised");
  await secrets.store(TOKEN_KEY, token);
  await secrets.store(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | undefined> {
  return secrets?.get(TOKEN_KEY);
}

export async function getUser(): Promise<AuthUser | undefined> {
  const raw = await secrets?.get(USER_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return undefined;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function logout(): Promise<void> {
  if (!secrets) return;
  await secrets.delete(TOKEN_KEY);
  await secrets.delete(USER_KEY);
}

export async function login(): Promise<{ token: string; user: AuthUser } | undefined> {
  const cfg = vscode.workspace.getConfiguration("or");
  const currentUrl = (cfg.get<string>("apiUrl") || "http://localhost:3001").replace(/\/+$/, "");

  const apiUrl = await vscode.window.showInputBox({
    prompt: "OR API URL",
    value: currentUrl,
    ignoreFocusOut: true,
  });
  if (!apiUrl) return undefined;

  if (apiUrl !== currentUrl) {
    await cfg.update("apiUrl", apiUrl, vscode.ConfigurationTarget.Global);
  }

  const email = await vscode.window.showInputBox({
    prompt: "OR account email",
    placeHolder: "you@example.com",
    ignoreFocusOut: true,
  });
  if (!email) return undefined;

  const password = await vscode.window.showInputBox({
    prompt: "Password",
    password: true,
    ignoreFocusOut: true,
  });
  if (!password) return undefined;

  const { loginApi } = await import("./api-client");
  const result = await loginApi(email, password);

  await storeSession(result.token, result.user);
  return result;
}
