/**
 * run-all.js — master test runner
 *
 * Runs all test suites in order and aggregates results:
 *   1. smoke test (quick connectivity)
 *   2. back‑end API tests
 *   3. front‑end JS tests
 *   4. front‑end HTML tests
 *
 * Run:  node tests/run-all.js
 */

import {execSync} from "child_process";
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const node  = process.execPath;

const suites = [
  ["Smoke check",       `${__dir}/smoke.test.js`],
  ["Backend API",       `${__dir}/backend/api.test.js`],
  ["Frontend JS",       `${__dir}/frontend/js.test.js`],
  ["Frontend HTML",     `${__dir}/frontend/html.test.js`],
];

let passed = 0, failed = 0;
const failures = [];

for (const [name, file] of suites) {
  process.stdout.write(`\n${"=".repeat(60)}\n`);
  process.stdout.write(`▶ ${name}\n`);
  process.stdout.write(`${"=".repeat(60)}\n`);
  try {
    execSync(`"${node}" "${file}"`, {
      cwd: resolve(__dir, ".."),
      stdio: "inherit",
      timeout: 120_000,
    });
    passed++;
  } catch (e) {
    failed++;
    failures.push(name);
    // Continue running remaining suites
  }
}

process.stdout.write(`\n\n${"=".repeat(60)}\n`);
process.stdout.write(`  FINAL:  ${passed} passed  |  ${failed} failed\n`);
if (failures.length > 0) {
  process.stdout.write(`  Failed suites: ${failures.join(", ")}\n`);
}
process.stdout.write(`${"=".repeat(60)}\n`);
process.exit(failed > 0 ? 1 : 0);