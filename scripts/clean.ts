// Post-processes downloaded HTML: since pages are now fetched via Wayback's
// id_ mode (byte-identical originals, no archive.org rewriting at all), the
// only cleanup needed is turning same-domain absolute URLs into relative
// paths, so the mirror is fully self-contained when hosted elsewhere.
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const SITE_DIR = join(import.meta.dir, "..", "docs");

// Matches http://ktown213.com/, http://www.ktown213.com/, https:// variants,
// with or without :80, case-insensitively.
const SAME_DOMAIN_RE = /https?:\/\/(?:www\.)?ktown213\.com(?::80)?\//gi;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  let cleaned = 0;
  for await (const file of walk(SITE_DIR)) {
    const ext = extname(file).toLowerCase();
    if (![".html", ".htm"].includes(ext)) continue;
    let text = await Bun.file(file).text();
    const before = text;
    text = text.replace(SAME_DOMAIN_RE, "/");
    if (text !== before) {
      await Bun.write(file, text);
      cleaned++;
    }
  }
  console.log(`Cleaned ${cleaned} HTML files.`);
}

main();
