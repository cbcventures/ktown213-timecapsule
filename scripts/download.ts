// Downloads a point-in-time mirror of ktown213.com from the Wayback Machine.
// Reads scripts/manifest.tsv (timestamp \t mimetype \t original_url) and
// writes each asset into site/ preserving its original URL path structure.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const MANIFEST = process.argv[2] ?? join(import.meta.dir, "manifest.tsv");
const OUT_DIR = join(import.meta.dir, "..", "docs");
const CONCURRENCY = 6;
const MAX_RETRIES = 4;

type Row = { timestamp: string; mimetype: string; url: string };

function localPathFor(url: string): string {
  // Strip scheme + host (+ optional :80) to get the path, default to index.html for "/"
  const u = url.replace(/^https?:\/\/[^\/]+/, "");
  let path = u === "" ? "/" : u;
  if (path.endsWith("/")) path += "index.html";
  // decode percent-encoding so files land at sane names
  try {
    path = decodeURIComponent(path);
  } catch {
    /* leave as-is if malformed */
  }
  return path.replace(/^\/+/, "");
}

async function fetchWithRetry(url: string): Promise<Response | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      return res; // some other non-ok status, don't retry
    } catch {
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  return null;
}

async function downloadOne(row: Row, index: number, total: number) {
  // id_ returns byte-identical original bytes with zero archive.org rewriting,
  // for both HTML and binary assets.
  const waybackUrl = `https://web.archive.org/web/${row.timestamp}id_/${row.url}`;
  const localPath = join(OUT_DIR, localPathFor(row.url));

  const res = await fetchWithRetry(waybackUrl);
  if (!res) {
    console.error(`[${index}/${total}] FAILED (no response): ${row.url}`);
    return { ok: false, url: row.url };
  }
  if (!res.ok) {
    console.error(`[${index}/${total}] FAILED (${res.status}): ${row.url}`);
    return { ok: false, url: row.url };
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  await mkdir(dirname(localPath), { recursive: true });
  await Bun.write(localPath, buf);
  if (index % 100 === 0) console.log(`[${index}/${total}] ${row.url}`);
  return { ok: true, url: row.url };
}

async function main() {
  const text = await Bun.file(MANIFEST).text();
  const rows: Row[] = text
    .trim()
    .split("\n")
    .map((line) => {
      const [timestamp, mimetype, url] = line.split("\t");
      return { timestamp, mimetype, url };
    });

  console.log(`Downloading ${rows.length} assets with concurrency ${CONCURRENCY}...`);

  const failures: string[] = [];
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const myIdx = idx++;
      const row = rows[myIdx];
      const result = await downloadOne(row, myIdx + 1, rows.length);
      if (!result.ok) failures.push(result.url);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\nDone. ${rows.length - failures.length}/${rows.length} succeeded.`);
  if (failures.length) {
    console.log(`Failed (${failures.length}):`);
    for (const f of failures) console.log("  " + f);
    await Bun.write(join(import.meta.dir, "failures.txt"), failures.join("\n") + "\n");
  }
}

main();
