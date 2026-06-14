# API Security Standard

## Section 4.1: Restrict CORS to trusted origins

APIs must restrict cross-origin access to an explicit allowlist of trusted origins.

## Section 4.2: Enforce authentication and authorization on sensitive routes

Sensitive API routes must verify the caller's identity and authorization before performing an operation.

## Section 4.3: Return safe error messages

API responses must not expose stack traces, secrets, internal paths, query details, or other sensitive implementation information.
