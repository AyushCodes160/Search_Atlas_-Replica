#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// helpers

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".html", ".yml", ".yaml", ".env", ".example",
]);

const EXCLUDE_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".turbo", ".vercel",
]);

function isTextFile(name) {
  if (name.startsWith(".env")) return true;
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return TEXT_EXTENSIONS.has(name.slice(dot));
}

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile() && isTextFile(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function safeResolve(rel) {
  const resolved = resolve(PROJECT_ROOT, rel);
  if (!resolved.startsWith(PROJECT_ROOT + sep) && resolved !== PROJECT_ROOT) {
    throw new Error(`Path escapes project root: ${rel}`);
  }
  return resolved;
}

async function readSafe(rel) {
  const full = safeResolve(rel);
  const s = await stat(full);
  if (!s.isFile()) throw new Error(`Not a file: ${rel}`);
  return readFile(full, "utf8");
}

// server

const server = new Server(
  { name: "seo-engine", version: "0.1.0" },
  { capabilities: { resources: {}, tools: {} } }
);

// resources

const STATIC_RESOURCES = [
  {
    uri: "seo-engine://readme",
    name: "README",
    description: "Project README — setup steps, stack, roadmap.",
    mimeType: "text/markdown",
    file: "README.md",
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const files = await walk(PROJECT_ROOT);
  const dynamic = files.map((abs) => {
    const rel = relative(PROJECT_ROOT, abs);
    return {
      uri: `seo-engine://file/${rel}`,
      name: rel,
      description: `Project file: ${rel}`,
      mimeType: rel.endsWith(".md") ? "text/markdown" : "text/plain",
    };
  });
  return { resources: [...STATIC_RESOURCES, ...dynamic] };
});

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  const staticHit = STATIC_RESOURCES.find((r) => r.uri === uri);
  if (staticHit) {
    const text = await readSafe(staticHit.file);
    return {
      contents: [{ uri, mimeType: staticHit.mimeType, text }],
    };
  }
  if (uri.startsWith("seo-engine://file/")) {
    const rel = uri.slice("seo-engine://file/".length);
    const text = await readSafe(rel);
    return {
      contents: [{ uri, mimeType: "text/plain", text }],
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

// tools

const TOOLS = [
  {
    name: "get_project_context",
    description:
      "Return a single bundled snapshot of the SEO Engine project: README plus the source files of the audit tool. Use this at the start of a new chat to instantly catch up.",
    inputSchema: {
      type: "object",
      properties: {
        include_code: {
          type: "boolean",
          description: "Whether to include source code files (default true).",
          default: true,
        },
      },
    },
  },
  {
    name: "read_project_file",
    description:
      "Read any text file inside the SEO Engine project by its relative path (e.g. 'src/app/page.tsx').",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to the project root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_project_files",
    description: "List all readable text files in the project.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === "get_project_context") {
      const includeCode = args.include_code !== false;
      const sections = [];
      try {
        sections.push(`# README.md\n\n${await readSafe("README.md")}`);
      } catch {}
      if (includeCode) {
        const codeFiles = [
          "src/app/page.tsx",
          "src/app/layout.tsx",
          "src/components/AuditTool.tsx",
          "src/app/api/audit/route.ts",
          "package.json",
        ];
        for (const f of codeFiles) {
          try {
            const text = await readSafe(f);
            sections.push(`# ${f}\n\n\`\`\`\n${text}\n\`\`\``);
          } catch {}
        }
      }
      return {
        content: [{ type: "text", text: sections.join("\n\n---\n\n") }],
      };
    }

    if (name === "read_project_file") {
      const text = await readSafe(args.path);
      return { content: [{ type: "text", text }] };
    }

    if (name === "list_project_files") {
      const files = await walk(PROJECT_ROOT);
      const rels = files.map((f) => relative(PROJECT_ROOT, f)).sort();
      return { content: [{ type: "text", text: rels.join("\n") }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${err?.message ?? err}` }],
    };
  }
});

// boot

async function main() {
  if (process.argv.includes("--self-check")) {
    const files = await walk(PROJECT_ROOT);
    console.log(`[self-check] project root: ${PROJECT_ROOT}`);
    console.log(`[self-check] tools: ${TOOLS.map((t) => t.name).join(", ")}`);
    console.log(`[self-check] static resources: ${STATIC_RESOURCES.length}`);
    console.log(`[self-check] dynamic file resources: ${files.length}`);
    process.exit(0);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[seo-engine-mcp] running on stdio");
}

main().catch((err) => {
  console.error("[seo-engine-mcp] fatal:", err);
  process.exit(1);
});
