# Search Atlas Replica — MCP Server

Lets any Claude chat (Claude Desktop, Claude Code, Antigravity, etc.) load this project's full context — conversation notes, README, source files — via the [Model Context Protocol](https://modelcontextprotocol.io).

So when you start a new chat, you ask "load my Search Atlas project" and the assistant can call this server to catch up instantly.

## What's exposed

### Tools (callable)
| Tool | Purpose |
| --- | --- |
| `get_project_context` | One bundled blob: conversation notes + README + key source files. Best first call in a new chat. |
| `read_project_file` | Read any text file in the repo by relative path. |
| `list_project_files` | List all readable text files. |
| `search_notes` | Substring search through `CONVERSATION_NOTES.md`. |

### Resources (auto-discoverable)
- `search-atlas://conversation-notes` — the master notes file.
- `search-atlas://readme` — project README.
- `search-atlas://file/<path>` — every text file in the repo, dynamically listed.

## Setup (one-time)

The server uses **stdio transport**, so any MCP-compatible client just needs to know how to launch it.

### Option A — Claude Desktop

Edit (or create) `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "search-atlas-replica": {
      "command": "node",
      "args": ["/Users/ayushkumar/Desktop/Search_Atlas_Replica/mcp-server/index.js"]
    }
  }
}
```

Then **fully quit and reopen Claude Desktop**. In a new chat, you'll see a 🔌 indicator showing the server is connected. Ask: *"Use the search-atlas-replica MCP to load my project context."*

### Option B — Claude Code

Add the server to Claude Code via its CLI:

```bash
claude mcp add search-atlas-replica node /Users/ayushkumar/Desktop/Search_Atlas_Replica/mcp-server/index.js
```

Or edit `~/.claude/settings.json` directly and add:

```json
{
  "mcpServers": {
    "search-atlas-replica": {
      "command": "node",
      "args": ["/Users/ayushkumar/Desktop/Search_Atlas_Replica/mcp-server/index.js"]
    }
  }
}
```

Restart any open Claude Code sessions to pick it up.

### Option C — Antigravity / other MCP clients

Use the same JSON config — most clients accept the standard `mcpServers` schema with `command` and `args`.

## Verify it works

From the terminal:

```bash
cd /Users/ayushkumar/Desktop/Search_Atlas_Replica/mcp-server
node index.js --self-check
```

You should see:
```
[self-check] tools: get_project_context, read_project_file, list_project_files, search_notes
[self-check] static resources: 2
[self-check] dynamic file resources: 19
```

## How to use it in a new chat

Once connected, start any new Claude chat with one of these prompts:

> *"Use the `search-atlas-replica` MCP to call `get_project_context` and catch me up on the Search Atlas project."*

> *"Read the conversation notes from the search-atlas-replica server and pick up where we left off."*

> *"Use `search_notes` on the search-atlas-replica MCP to find what we decided about OTTO-lite."*

That's it — no copy-paste, no re-explaining the project.

## Updating the context

The server reads files live from disk on every request, so **whatever's in `CONVERSATION_NOTES.md` is what gets served**. Edit that file (or ask Claude to update it) to add new decisions / progress.
