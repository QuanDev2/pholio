#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUTPUT_FILE = path.join(ROOT, "..", "docs", "FILE_INDEX.md");

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) results.push(full);
  }
  return results;
}

function extractExports(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const exports = [];

  const defaultFn = src.match(/export default (?:function|class)\s+(\w+)/);
  if (defaultFn) exports.push(`${defaultFn[1]} (default)`);
  else {
    const defaultId = src.match(/^export default (\w+)\s*;?\s*$/m);
    if (defaultId) exports.push(`${defaultId[1]} (default)`);
  }

  for (const m of src.matchAll(/^export (?:function|const|class|type|interface)\s+(\w+)/gm)) {
    exports.push(m[1]);
  }

  return exports;
}

const files = walk(SRC_DIR);
const date = new Date().toISOString().split("T")[0];
const lines = [`# File Index — generated ${date}`, ""];

const byDir = {};
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const dir = path.dirname(rel);
  (byDir[dir] ||= []).push(file);
}

for (const [dir, dirFiles] of Object.entries(byDir).sort()) {
  lines.push(`### ${dir}/`);
  for (const file of dirFiles) {
    const name = path.basename(file);
    const exports = extractExports(file);
    const exportStr = exports.length ? ` — ${exports.join(", ")}` : "";
    lines.push(`- \`${name}\`${exportStr}`);
  }
  lines.push("");
}

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, lines.join("\n"));
console.log(`Written: ${OUTPUT_FILE}`);
