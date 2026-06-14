# SecureGuard-LM IQ Demo Video Script

Target duration: 2 minutes maximum.

## 0:00-0:15 - Problem

**Show:** Landing page.

**Say:** "AI-assisted coding is fast, but insecure code can reach production. SecureGuard-LM IQ helps teams review code against trusted security policies before merge."

## 0:15-0:30 - Solution

**Show:** Open the Security Review dashboard.

**Say:** "SecureGuard-LM IQ is a policy-guided reasoning agent. It scans code, retrieves policy evidence, reasons over risk, generates safer fixes, and creates a PR-ready security report."

## 0:30-0:55 - Run Scan

**Show:** Click **Load Demo Vulnerable Code**, then **Run SecureGuard Agent**.

**Say:** "The synthetic Express demo contains SQL injection, a hardcoded secret, weak CORS, missing input validation, and an unsafe upload handler. The agent detects all five and calculates a blocking risk score."

## 0:55-1:15 - Foundry IQ Grounding

**Show:** Policy evidence section and citations.

**Say:** "Every finding is grounded in trusted policy evidence. This MVP uses a Foundry IQ-compatible policy retrieval layer with synthetic policy documents, and the provider architecture is ready for real Microsoft Foundry IQ integration."

## 1:15-1:35 - Generate Fix

**Show:** Click **Generate Safer Fix**, then show the before-and-after diff and lower risk score.

**Say:** "SecureGuard generates a safer implementation using parameterized queries, environment-based secrets, restricted CORS, input validation, and secure upload controls. The modeled risk falls from 91 to 27."

## 1:35-1:50 - Security Proof Pack

**Show:** Attack Replay, Traceability Matrix, and Secure Merge Passport.

**Say:** "The Security Proof Pack safely replays each risk, connects policy to patch, and creates a Secure Merge Passport. From vulnerability detection to policy-grounded proof of remediation."

## 1:50-2:00 - PR Report

**Show:** Click **Generate PR Report** and show the report preview.

**Say:** "SecureGuard-LM IQ does not auto-merge code. It gives developers grounded evidence and safer fixes for human review."
