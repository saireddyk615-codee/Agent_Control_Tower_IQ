#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const latestApi = join(root, "app", "api", "watchtower", "latest-report", "route.ts");
const workoutReport = "/Users/shivareddy/IdeaProjects/Workout App/.agent-control-tower/watchtower-latest.json";
let failed = false;

function check(label, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}${detail ? ` - ${detail}` : ""}`);
  failed ||= !passed;
}

check("latest-report API exists", existsSync(latestApi), latestApi);
check("Workout App latest report exists", existsSync(workoutReport), existsSync(workoutReport) ? workoutReport : "Run a Watchtower scan first.");

const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", stdio: "pipe" });
check("portal production build", build.status === 0, build.status === 0 ? "npm run build passed" : "npm run build failed");
if (build.status !== 0) console.log(build.stdout + build.stderr);

console.log("\nManual browser session check:");
console.log("1. Open http://localhost:3000/watchtower and run a scan.");
console.log("2. Navigate Reports → Watchtower → Compare → Watchtower.");
console.log("3. Refresh and confirm the result remains.");
console.log("4. Click Clear Session and confirm only browser UI state clears.");

if (failed) process.exitCode = 1;
