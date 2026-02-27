# Orqestra — VSCode Extension

Receive execution bundles and submit evidence from your IDE.

## Features

- **Fetch Bundle** — enter a Jira ticket ID, get a structured execution bundle (tasks, acceptance criteria, context) in the sidebar
- **Submit Evidence** — report local test results back to Orqestra, linked to the current bundle
- **Status Bar** — shows the active ticket at a glance

## Setup

1. Install the extension (VSIX or marketplace)
2. Open **Settings** and configure:
   - `orqestra.apiUrl` — your Orqestra API URL (default: `http://localhost:3001`)
   - `orqestra.apiToken` — your auth token (optional for local dev)
3. Open the command palette (`Cmd+Shift+P`) and run **Orqestra: Fetch Bundle**

## Development

```bash
npm install
npm run build    # one-time build
npm run watch    # rebuild on change
```

Press `F5` in VSCode to launch the Extension Development Host.
