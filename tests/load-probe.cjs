// Concurrency probe: fire N requests at a URL in parallel batches and report
// latency + failures. Use it to confirm the GUARANTEED static path stays fast
// and 100% successful under burst (the heat-wave traffic case), and — pointed
// at a gviz URL — to see how the live sheet behaves under load before relying
// on it. Requires Node 18+ (global fetch).
//
//   node tests/load-probe.cjs <url> [totalRequests] [concurrency]
//
// Examples:
//   node tests/load-probe.cjs https://koeltekaartamsterdam.nl/data/locations.csv 500 50
//   node tests/load-probe.cjs "https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&gid=0" 100 10
//
// Be considerate with third-party (Google) targets — keep counts modest.

const url = process.argv[2];
const total = parseInt(process.argv[3] || "200", 10);
const concurrency = parseInt(process.argv[4] || "25", 10);

if (!url) {
  console.error("usage: node tests/load-probe.cjs <url> [totalRequests] [concurrency]");
  process.exit(2);
}

async function one() {
  const t0 = performance.now();
  try {
    const r = await fetch(url, { cache: "no-store" });
    const body = await r.text();
    return { ok: r.ok, status: r.status, ms: performance.now() - t0, bytes: body.length };
  } catch (e) {
    return { ok: false, status: 0, ms: performance.now() - t0, error: e.message };
  }
}

(async () => {
  console.log(`Probing ${url}\n  ${total} requests, ${concurrency} in flight\n`);
  const results = [];
  let next = 0;
  const wallStart = performance.now();
  async function worker() {
    while (next < total) { next++; results.push(await one()); }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const wall = performance.now() - wallStart;

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const lat = ok.map(r => r.ms).sort((a, b) => a - b);
  const pct = p => lat.length ? lat[Math.min(lat.length - 1, Math.floor(p / 100 * lat.length))].toFixed(0) : "—";

  console.log(`  success : ${ok.length}/${results.length}`);
  console.log(`  failed  : ${fail.length}`);
  if (lat.length) console.log(`  latency : p50 ${pct(50)}ms  p95 ${pct(95)}ms  p99 ${pct(99)}ms  max ${pct(100)}ms`);
  console.log(`  wall    : ${(wall / 1000).toFixed(1)}s  (${(results.length / (wall / 1000)).toFixed(0)} req/s)`);
  if (fail.length) {
    const codes = {};
    fail.forEach(f => { const k = f.error || `HTTP ${f.status}`; codes[k] = (codes[k] || 0) + 1; });
    console.log("  failure breakdown:", codes);
  }
  // Non-zero exit if ANY request to a same-origin static asset failed.
  process.exitCode = fail.length ? 1 : 0;
})();
