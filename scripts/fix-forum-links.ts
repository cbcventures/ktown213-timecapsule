// The phpBB forum (20k+ pages) is out of scope for this static mirror.
// Rather than leaving dead /forums links, point them at the closest live
// Wayback Machine capture of the forum so navigation stays functional.
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const SITE_DIR = join(import.meta.dir, "..", "docs");
const FORUM_BASE = "https://web.archive.org/web/20040612065731/http://www.ktown213.com/forums/";

// Matches href="/forums", href="/forums/", href="/forums/anything", href="../forums/anything"
const FORUM_LINK_RE = /(href|src)="(?:\.\.\/|\/)+forums\/?([^"]*)"/gi;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  let count = 0;
  for await (const file of walk(SITE_DIR)) {
    if (![".html", ".htm"].includes(extname(file).toLowerCase())) continue;
    const text = await Bun.file(file).text();
    const replaced = text.replace(FORUM_LINK_RE, (_match, attr, rest) => {
      count++;
      return `${attr}="${FORUM_BASE}${rest}"`;
    });
    if (replaced !== text) await Bun.write(file, replaced);
  }
  console.log(`Rewrote ${count} forum links to point at the live Wayback Machine capture.`);
}

main();
