#!/usr/bin/env node

const baseUrl = "http://localhost:3000";
const routes = ["/", "/watchtower", "/reports", "/integrations", "/submission"];
let reachable = false;
let failed = false;

for (const route of routes) {
  const url = `${baseUrl}${route}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    reachable = true;
    const passed = response.status === 200;
    failed ||= !passed;
    console.log(`${passed ? "PASS" : "FAIL"} ${url} (${response.status})`);
  } catch {
    failed = true;
    console.log(`FAIL ${url} (unreachable)`);
  }
}

console.log(`\nOpen: ${baseUrl}/watchtower`);
if (!reachable) console.log("Run npm run dev:clean first.");
if (failed) process.exitCode = 1;
