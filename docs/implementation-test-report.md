# Agent Control Tower IQ — Implementation and Test Report

## 1. Executive Summary

Agent Control Tower IQ is a local-first, synthetic agent safety and secure code review demonstration. Its primary workflow evaluates an agent task before execution, redacts risky context, estimates blast radius, constrains capabilities, quarantines unsafe tools, and produces auditable safety artifacts. Supporting modes assess repository readiness, inspect agent-generated diffs, sanitize agent output, build minimal safe handoffs, and review vulnerable code against synthetic policy evidence.

The application runs without Azure credentials in mock mode. During this audit, no pasted code, agent tool, or shell command from user input was executed, and no external service was called. The optional real Foundry IQ provider remains inactive unless explicitly configured.

## 2. Implemented Features

| Feature | Status | Files | Notes |
|---|---|---|---|
| Agent Preflight | Verified | `app/agent-safety/page.tsx`, `app/api/studio/preflight/route.ts`, `lib/studio/agentPreflight.ts` | Produces a blocked/allowed decision, risk score, redaction, blast radius, leases, and artifacts. |
| Repo Guardian | Verified | `app/repo-guardian/page.tsx`, `app/api/studio/repo-guardian/route.ts`, `lib/studio/repoGuardian.ts` | Scores repository readiness and recommends/generates safety files. |
| Diff Guard | Verified | `app/diff-guard/page.tsx`, `app/api/studio/diff-guard/route.ts`, `lib/studio/agentDiffGuard.ts` | Detects risky package scripts, workflows, external URLs, secrets, and excessive scope. |
| Output Firewall | Verified | `app/output-firewall/page.tsx`, `app/api/studio/output-firewall/route.ts`, `lib/studio/outputFirewall.ts` | Detects and sanitizes fake secrets, internal URLs, and local HoneyContext canaries. |
| Safe Handoff Builder | Verified | `app/safe-handoff/page.tsx`, `app/api/studio/safe-handoff/route.ts`, `lib/studio/safeHandoffBuilder.ts` | Removes unnecessary sensitive context and builds a constrained handoff. |
| `.agent-safety.yml` generator | Verified | `lib/studio/agentPreflight.ts`, `lib/studio/repoGuardian.ts` | Generated as a downloadable/copyable artifact. |
| Context, Tool, and Memory SBOMs | Verified | `lib/studio/agentPreflight.ts`, `lib/studio/repoGuardian.ts` | Documents agent context, tools, and memory exposure. |
| Permission Leases | Verified | `lib/studio/agentPreflight.ts` | Grants bounded, expiring permissions for the synthetic run. |
| Capability Budget | Verified | `lib/studio/agentPreflight.ts` | Limits tool calls, writes, network access, and execution scope. |
| Agent Run Permit | Verified | `lib/studio/agentPreflight.ts` | Records the run decision, constraints, and review requirements. |
| Agent Digital Twin Simulation | Verified | `lib/studio/agentPreflight.ts` | Performs deterministic local simulation only. |
| Agent Safety Manifest | Verified | `lib/studio/agentPreflight.ts` | Generated and exposed as `AGENT_SAFETY_MANIFEST.json`. |
| Agent Passport and Flight Record | Verified | `lib/studio/agentPreflight.ts` | Generates identity/constraints summary and audit record. |
| Agent Safety Capsule | Verified | `lib/studio/agentPreflight.ts` | Packages the compact run decision and controls. |
| Safety Regression Tests | Verified | `lib/studio/agentPreflight.ts` | Generates deterministic mutation-test results. |
| Unsafe Path Graph | Verified | `lib/studio/agentPreflight.ts` | Shows risky context-to-tool-to-impact paths. |
| MCP Quarantine | Verified | `lib/studio/agentPreflight.ts` | Identifies tools that must remain unavailable. It does not enforce a real MCP runtime. |
| Public Submission Guard | Verified | `lib/studio/agentPreflight.ts` | Flags unsafe public submission content. |
| HoneyContext local canary | Verified | `lib/studio/agentPreflight.ts`, `lib/studio/outputFirewall.ts` | Canary is synthetic and explicitly local-only. |
| Context Expiry and Consent Ledger | Verified | `lib/studio/agentPreflight.ts` | Adds expiry and consent audit metadata. |
| Safety Contract | Verified | `lib/studio/agentPreflight.ts` | Generates `AGENT_SAFETY_CONTRACT.md`. |
| Secure code review | Verified | `app/scan/page.tsx`, `app/api/scan/route.ts`, `lib/scanner/` | Scans synthetic market-language examples and grounds findings in mock policy evidence. |

## 3. Product Modes

| Mode | Route | Status | What it does |
|---|---|---|---|
| Control Tower | `/control-tower` | HTTP 200, verified | Presents the primary agent safety workflows and judge-friendly entry points. |
| Agent Preflight | `/agent-safety` | HTTP 200, verified | Evaluates a risky synthetic agent task before execution and creates safety artifacts. |
| Repo Guardian | `/repo-guardian` | HTTP 200, verified | Assesses repository agent-safety readiness. |
| Diff Guard | `/diff-guard` | HTTP 200, verified | Reviews a synthetic agent-generated diff for dangerous changes. |
| Output Firewall | `/output-firewall` | HTTP 200, verified | Detects and removes unsafe output content. |
| Safe Handoff | `/safe-handoff` | HTTP 200, verified | Creates a constrained planner-to-coder handoff. |
| Secure Code Review | `/scan` | HTTP 200, verified | Scans vulnerable synthetic code and retrieves mock policy citations. |
| Submission | `/submission` | HTTP 200, verified | Presents the hackathon submission summary and demo positioning. |

## 4. API Routes Verified

| API Route | Status | Input | Output |
|---|---|---|---|
| `/api/studio/preflight` | Verified, HTTP 200 | Synthetic task, context, tools, and options | Decision, redaction, blast radius, controls, and 12 safety artifacts |
| `/api/studio/repo-guardian` | Verified | Repository text/configuration | Readiness score, findings, and recommended safety files |
| `/api/studio/diff-guard` | Verified | Synthetic diff | Risk findings and block/review decision |
| `/api/studio/output-firewall` | Verified | Synthetic agent output | Findings, decision, and sanitized output |
| `/api/studio/safe-handoff` | Verified | Synthetic handoff context | Minimal safe handoff prompt and removed-context summary |
| `/api/scan` | Verified | Synthetic code and language | Risk score, findings, and mock Foundry IQ-compatible citations |
| `/api/fix` | Build-verified | Code and detected issues | Deterministic safer fix and before/after risk |
| `/api/report` | Build-verified | Scan/fix results | PR-ready security report |
| `/api/artifacts` | Build-verified | Security result data | DevSecOps/judge-ready export artifacts |
| `/api/health` | Build-verified | None | Application health response |

Studio API request validation returns bounded, safe error messages and does not expose stack traces. A malformed studio request was verified to return HTTP 400.

## 5. Generated Safety Artifacts

| Artifact | Actually generates | Generator |
|---|---|---|
| `.agent-safety.yml` | Yes | Agent Preflight and Repo Guardian |
| `CONTEXT_SBOM.json` | Yes | Agent Preflight and Repo Guardian |
| `TOOL_SBOM.json` | Yes | Agent Preflight |
| `MEMORY_SBOM.json` | Yes | Agent Preflight |
| `AGENT_RUN_PERMIT.json` | Yes | Agent Preflight |
| `CAPABILITY_BUDGET.json` | Yes | Agent Preflight |
| `SAFE_AGENT_HANDOFF.md` | Yes | Agent Preflight and Safe Handoff Builder |
| `AGENT_FLIGHT_RECORD.json` | Yes | Agent Preflight |
| `AGENT_SAFETY_CONTRACT.md` | Yes | Agent Preflight |
| `AGENT_PASSPORT.md` | Yes | Agent Preflight |
| `AGENT_SAFETY_CAPSULE.json` | Yes | Agent Preflight |
| `AGENT_SAFETY_MANIFEST.json` | Yes | Agent Preflight |

## 6. Build and Test Results

| Check | Result | Details |
|---|---|---|
| `npm install` | Pass | Dependencies up to date; 360 packages audited; 0 vulnerabilities reported. |
| `npm test` | Pass | 6 tests passed, 0 failed. Tests cover context risk/redaction, Diff Guard, Output Firewall, Repo Guardian, Safe Handoff, manifest, capability budget, run permit, and mutation tests. |
| `npm run lint` | Pass | Completed with no lint errors. |
| `npm run build` | Pass | Next.js 16.2.9 production build completed; all 22 routes built. |
| Major page HTTP checks | Pass | `/`, `/control-tower`, `/agent-safety`, `/repo-guardian`, `/diff-guard`, `/output-firewall`, `/safe-handoff`, `/scan`, and `/submission` returned HTTP 200. |
| Agent Preflight manual test | Pass | Returned `run_blocked`, risk 90, 12 artifacts, 4 permission leases, 2 quarantined tools, redacted context, blast radius, and local-only HoneyContext. |
| Repo Guardian manual test | Pass | Readiness score and recommended safety files appeared, including `.agent-safety.yml`. |
| Diff Guard manual test | Pass | Detected package script, workflow, external URL, fake secret, and scope risk; blocked the risky diff. |
| Output Firewall manual test | Pass | Detected/sanitized fake secret, internal URL, and HoneyContext canary. |
| Safe Handoff manual test | Pass | Removed secret/context/injection content and produced a constrained handoff. |
| Secure code review manual test | Pass | Existing scan workflow detected five findings in the vulnerable Node demo and remained in mock IQ mode. |
| Market-language scan checks | Pass | Node 5, Python 5, Java 5, C# 4, Go 5, PHP 4, C++ 4, and Rust 2 findings; all used mock IQ mode. |

Security verification:

* No user-submitted code or agent tool was executed.
* No shell command was constructed from user input.
* No real credentials were stored or used.
* All tested scans reported `iqMode: mock` and `iqProvider: mock-foundry-iq`.
* The optional Azure provider is inactive unless real mode and all required environment variables are explicitly configured.
* Demo secrets and HoneyContext canaries are synthetic; HoneyContext is marked local-only.

## 7. Bugs Found and Fixed

| Bug | Fix |
|---|---|
| `/agent-safety` and a complete Agent Preflight workflow were missing. | Added the page, preflight API, deterministic engine, navigation links, demo input, controls, and artifact generation. |
| Required safety artifacts and controls were not available from one preflight run. | Added Context/Tool/Memory SBOMs, permission leases, capability budget, run permit, manifest, flight record, passport, capsule, contract, handoff, unsafe graph, quarantine, consent, expiry, and regression results. |
| Agent Safety Manifest was computed but omitted from the artifact output, causing incomplete behavior and a lint warning. | Exposed `AGENT_SAFETY_MANIFEST.json` in generated artifacts and removed the unused-value issue. |
| Diff Guard did not explicitly label added lifecycle scripts such as `postinstall` as a package-script modification. | Added deterministic detection for added `postinstall`, `preinstall`, and `prepare` script lines. |
| No unit-test command or minimal pure-module test suite existed. | Added a low-overhead Node test setup and six focused tests covering the requested pure functionality. |

## 8. Remaining Limitations

* Foundry IQ-compatible policy retrieval is mock/local by default. The optional real Azure provider requires explicit configuration and was not used during testing.
* Agent runs, tools, repository content, diffs, output, and handoffs are local synthetic simulations.
* The product is not yet a runtime enforcement engine.
* There is no real GitHub App integration.
* MCP Quarantine reports what should be blocked but does not control a real MCP runtime.
* Digital-twin and mutation testing are deterministic demonstrations, not execution in an isolated production sandbox.
* Copy/download behavior depends on browser permissions and was not used as proof of runtime enforcement.

## 9. Demo Readiness

The application is ready for a hackathon demo in local mock mode.

Exact 2-minute demo flow:

1. **0:00–0:20 — Control Tower:** Open `/control-tower` and explain that Agent Control Tower IQ evaluates agent actions before, during, and after a run.
2. **0:20–0:50 — Agent Preflight:** Open `/agent-safety`, click **Run Agent Preflight**, and show the blocked decision, redacted context, blast radius, Permission Leases, Capability Budget, MCP Quarantine, and Agent Safety Capsule.
3. **0:50–1:10 — Repo Guardian:** Open `/repo-guardian`, run the synthetic repository check, and show the readiness score plus `.agent-safety.yml` and SBOM recommendations.
4. **1:10–1:30 — Diff Guard:** Open `/diff-guard`, load/run the risky diff, and show detection of a package lifecycle script, workflow change, external URL, fake secret, and the block decision.
5. **1:30–1:45 — Output Firewall:** Open `/output-firewall` and show the fake secret, internal URL, and local HoneyContext canary removed from sanitized output.
6. **1:45–1:55 — Safe Handoff:** Open `/safe-handoff` and show a constrained planner-to-coder prompt with sensitive raw context removed.
7. **1:55–2:00 — Secure Code Review:** Open `/scan` and state that the existing secure code review remains available with synthetic policy grounding and PR-ready outputs.

## 10. Final Verdict

**Ready for demo**
