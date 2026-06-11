/**
 * smoke.test.js — quick smoke test (5 seconds max)
 *
 * Verifies the Gateway and all routed services are alive.
 * Run:  node tests/smoke.test.js
 */

import {fetchJSON} from "./helpers.js";

const checks = [
  ["Gateway /bible",       "/bible/translations"],
  ["Gateway /strongs",     "/strongs/G25"],
  ["Gateway /search",      "/search?query=God&translation=kjv"],
  ["Gateway /annotations", "/annotations/commentaries/gen/1"],
  ["Gateway /modules",     "/modules/available"],
];

let ok = 0, fail = 0;
for (const [label, path] of checks) {
  try {
    await fetchJSON(path);
    process.stdout.write(`  ✓ ${label.padEnd(24)} OK\n`);
    ok++;
  } catch (e) {
    process.stderr.write(`  ✗ ${label.padEnd(24)} FAIL — ${e.message}\n`);
    fail++;
  }
}
process.stdout.write(`\nSmoke: ${ok}/${checks.length} services reachable\n`);
process.exit(fail > 0 ? 1 : 0);