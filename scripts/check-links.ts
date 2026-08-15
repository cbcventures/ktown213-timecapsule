// Crawls every downloaded HTML file for local resource references
// (href/src/background/codebase) and reports any that don't resolve
// to a file on disk, so we know the real scope of remaining gaps.
import { readdir } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { existsSync } from "node:fs";

const SITE_DIR = join(import.meta.dir, "..", "docs");
const ATTR_RE = /(?:href|src|background|codebase)\s*=\s*"([^"]*)"/gi;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function isSkippable(ref: string): boolean {
  return (
    ref === "" ||
    ref.startsWith("#") ||
    ref.startsWith("javascript:") ||
    ref.startsWith("mailto:") ||
    /^https?:\/\//i.test(ref) ||
    ref.startsWith("//")
  );
}

async function main() {
  const missing = new Map<string, string[]>(); // resolved path -> referencing files
  let totalRefs = 0;
  for await (const file of walk(SITE_DIR)) {
    if (![".html", ".htm"].includes(extname(file).toLowerCase())) continue;
    const text = await Bun.file(file).text();
    for (const m of text.matchAll(ATTR_RE)) {
      let ref = m[1].split("#")[0].split("?")[0];
      if (isSkippable(m[1])) continue;
      totalRefs++;
      const base = ref.startsWith("/") ? SITE_DIR : dirname(file);
      const resolved = normalize(join(base, decodeURIComponent(ref)));
      if (!resolved.startsWith(SITE_DIR)) continue; // escapes site root, skip
      if (!existsSync(resolved)) {
        const list = missing.get(resolved) ?? [];
        list.push(file.replace(SITE_DIR, ""));
        missing.set(resolved, list);
      }
    }
  }
  console.log(`Checked ${totalRefs} local references.`);
  console.log(`Missing targets: ${missing.size}`);
  const sorted = [...missing.entries()].sort((a, b) => b[1].length - a[1].length);
  const limit = process.argv[2] === "--all" ? sorted.length : 60;
  for (const [target, refs] of sorted.slice(0, limit)) {
    console.log(`${target.replace(SITE_DIR, "")}\t${refs.length}\t${refs[0]}`);
  }
}

main();
