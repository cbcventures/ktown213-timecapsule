// Retries assets that 404'd under id_ mode (usually "revisit" CDX records).
// Falls back to im_ mode, then to the plain (redirect-following) URL.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const MANIFEST = join(import.meta.dir, "manifest.tsv");
const FAILURES = join(import.meta.dir, "failures.txt");
const OUT_DIR = join(import.meta.dir, "..", "docs");

function localPathFor(url: string): string {
  const u = url.replace(/^https?:\/\/[^\/]+/, "");
  let path = u === "" ? "/" : u;
  if (path.endsWith("/")) path += "index.html";
  try {
    path = decodeURIComponent(path);
  } catch {}
  return path.replace(/^\/+/, "");
}

async function main() {
  const manifestText = await Bun.file(MANIFEST).text();
  const tsByUrl = new Map<string, string>();
  for (const line of manifestText.trim().split("\n")) {
    const [timestamp, , url] = line.split("\t");
    tsByUrl.set(url, timestamp);
  }

  const failedUrls = (await Bun.file(FAILURES).text()).trim().split("\n").filter(Boolean);
  const stillFailed: string[] = [];

  for (const url of failedUrls) {
    const ts = tsByUrl.get(url);
    const candidates = [
      `https://web.archive.org/web/${ts}im_/${url}`,
      `https://web.archive.org/web/${ts}/${url}`,
    ];
    let done = false;
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, { redirect: "follow" });
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          const localPath = join(OUT_DIR, localPathFor(url));
          await mkdir(dirname(localPath), { recursive: true });
          await Bun.write(localPath, buf);
          console.log(`OK (${candidate.includes("im_") ? "im_" : "plain"}): ${url}`);
          done = true;
          break;
        }
      } catch {}
    }
    if (!done) {
      console.error(`STILL FAILED: ${url}`);
      stillFailed.push(url);
    }
  }

  console.log(`\n${failedUrls.length - stillFailed.length}/${failedUrls.length} recovered.`);
  await Bun.write(FAILURES, stillFailed.join("\n") + (stillFailed.length ? "\n" : ""));
}

main();
